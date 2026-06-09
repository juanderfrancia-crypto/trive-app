import { supabase } from './supabase'

/**
 * Get a stable storage URL for a file.
 * If the bucket is public, use the persistent public URL.
 * Otherwise fall back to a longer-lived signed URL.
 */
const PUBLIC_BUCKETS = new Set(['profile-photos', 'vehicle-photos'])

async function getStorageUrl(
  bucket: string,
  filePath: string,
  options?: { allowPublicUrl?: boolean }
): Promise<string> {
  try {
    const allowPublicUrl = options?.allowPublicUrl ?? PUBLIC_BUCKETS.has(bucket)

    // Si es URL pública, intentar primero con getPublicUrl (sin expiración)
    if (allowPublicUrl) {
      const result = await supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)
      
      const publicData = result.data

      if (publicData?.publicUrl && !publicData.publicUrl.includes('null')) {
        console.log('✅ Using public URL for', bucket, ':', publicData.publicUrl.substring(0, 60) + '...')
        return publicData.publicUrl
      }
    }

    // Fallback: URL firmada (para buckets privados o si getPublicUrl falla)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 30) // 30 days

    if (!error && data?.signedUrl) {
      console.log('⏰ Using signed URL (expires 30 days) for', bucket)
      return data.signedUrl
    }

    throw error || new Error('No se pudo generar la URL de storage')
  } catch (err) {
    console.error('❌ getStorageUrl error:', err)
    throw err
  }
}

/**
 * Regenerate expired signed URLs to public URLs.
 * If a URL is a signed URL with an expired token, convert it to a public URL.
 */
export async function regenerateExpiredPhotoUrl(
  oldUrl: string,
  bucket: 'vehicle-photos' | 'profile-photos'
): Promise<string> {
  try {
    // Check if it's a signed URL (contains /sign/)
    if (!oldUrl.includes('/sign/')) {
      console.log('✅ URL is already public:', oldUrl.substring(0, 60) + '...')
      return oldUrl // Already a public URL
    }

    console.log('♻️  [regenerateExpiredPhotoUrl] Converting signed URL to public...')

    // Extract file path from signed URL
    // Format: https://...supabase.co/storage/v1/object/sign/bucket/path/to/file?token=...
    const pathMatch = oldUrl.match(/\/storage\/v1\/object\/sign\/[^\/]+\/(.+?)\?/)
    if (!pathMatch || !pathMatch[1]) {
      console.warn('Could not extract file path from URL:', oldUrl.substring(0, 80))
      return oldUrl // Return original if we can't parse it
    }

    const filePath = decodeURIComponent(pathMatch[1])
    console.log('📂 [regenerateExpiredPhotoUrl] File path:', filePath)

    // Generate new public URL
    const result = await supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    const publicUrl = result.data?.publicUrl
    if (publicUrl && !publicUrl.includes('null')) {
      console.log('✅ [regenerateExpiredPhotoUrl] New public URL:', publicUrl.substring(0, 60) + '...')
      return publicUrl
    }

    console.warn('Failed to generate public URL, returning original')
    return oldUrl
  } catch (err) {
    console.error('❌ regenerateExpiredPhotoUrl error:', err)
    return oldUrl // Return original URL as fallback
  }
}

/**
 * Convert image URI to Uint8Array (React Native compatible)
 */
async function uriToUint8Array(uri: string): Promise<Uint8Array> {
  try {
    // Fetch the file from URI
    const response = await fetch(uri)
    const blob = await response.blob()
    
    // Try to use arrayBuffer if available (web, modern RN)
    if (typeof blob.arrayBuffer === 'function') {
      const arrayBuffer = await blob.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    }
    
    // Fallback: convert blob to base64 string, then to Uint8Array
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const result = reader.result as string
          // Extract base64 from data URL: "data:image/jpeg;base64,xxx" -> "xxx"
          const base64 = result.split(',')[1] || result
          // Convert base64 to Uint8Array
          const binaryString = atob(base64)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          resolve(bytes)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('FileReader error'))
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error converting URI to Uint8Array:', error)
    throw error
  }
}

/**
 * Upload profile photo for a user
 * @param userId - User ID
 * @param fileUri - Local URI of the image file
 */
export async function uploadProfilePhoto(userId: string, fileUri: string): Promise<string | null> {
  try {
    // Validate user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (!authUser || authUser.id !== userId) {
      throw new Error('No tienes permiso para subir fotos como este usuario')
    }

    // Read file as Uint8Array using fetch (cross-platform compatible)
    const bytes = await uriToUint8Array(fileUri)

    // Create file path
    const timestamp = Date.now()
    const filePath = `profiles/${userId}/${timestamp}-profile.jpg`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, bytes, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Error al subir la foto: ${uploadError.message}`)
    }

    // Get a stable storage URL for the uploaded profile image
    const photoUrl = await getStorageUrl('profile-photos', filePath, { allowPublicUrl: true })
    console.log('✅ [uploadProfilePhoto] URL generada:', photoUrl.substring(0, 100) + '...')

    // Update profile in database
    const { data, error: dbError } = await supabase
      .from('profiles')
      .update({ avatar_url: photoUrl, profile_photo_url: photoUrl })
      .eq('id', userId)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error(`Error al guardar la foto: ${dbError.message}`)
    }

    return photoUrl
  } catch (error) {
    console.error('Error uploading profile photo:', error)
    throw error
  }
}

/**
 * Upload vehicle photo for a driver's route
 * @param driverId - Driver/User ID
 * @param routeId - Route ID (if available) or null to create generic vehicle photo
 * @param fileUri - Local URI of the image file
 */
export async function getVehiclePhotoUrl(driverId: string): Promise<string | null> {
  // Try paths in order of likelihood (simplest first)
  const candidatePaths = [
    `vehicle_${driverId}.jpg`,
    `${driverId}/vehicle.jpg`,
    `drivers/${driverId}/vehicle.jpg`,
    `drivers/${driverId}/routes/*/vehicle.jpg` // This won't work as a direct path
  ]

  for (const filePath of candidatePaths) {
    // Skip wildcard paths - they won't work with getStorageUrl
    if (filePath.includes('*')) continue
    
    try {
      const url = await getStorageUrl('vehicle-photos', filePath, { allowPublicUrl: true })
      if (url) return url
    } catch (error) {
      console.warn(`Vehicle photo not found at ${filePath}:`, error)
    }
  }

  console.error('Error getting vehicle photo URL: no valid path found')
  return null
}

export async function uploadVehiclePhoto(
  driverId: string,
  routeId: string | null,
  fileUri: string
): Promise<string | null> {
  try {
    // Validate user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (!authUser || authUser.id !== driverId) {
      throw new Error('No tienes permiso para subir fotos como este usuario')
    }

    // Read file as Uint8Array using fetch (cross-platform compatible)
    const bytes = await uriToUint8Array(fileUri)

    // Create candidate file paths - prioritize paths with folder structure for RLS compliance
    // Include timestamp to ensure unique paths and force React to detect URL changes
    const timestamp = Date.now()
    const basePaths = routeId
      ? [
          `drivers/${driverId}/routes/${routeId}/${timestamp}-vehicle.jpg`, // Full structure with timestamp (best for RLS)
          `drivers/${driverId}/${timestamp}-vehicle.jpg`, // Driver folder structure with timestamp
          `${driverId}/${timestamp}-vehicle.jpg`, // Driver ID only with timestamp
          `vehicle_${driverId}_${timestamp}.jpg`, // Simplest with timestamp
        ]
      : [
          `drivers/${driverId}/${timestamp}-vehicle.jpg`, // Driver folder structure with timestamp (best for RLS)
          `${driverId}/${timestamp}-vehicle.jpg`, // Driver ID only with timestamp
          `vehicle_${driverId}_${timestamp}.jpg`, // Simplest with timestamp
        ]

    let uploadedFilePath: string | null = null
    let uploadError: any = null

    for (const candidatePath of basePaths) {
      console.log(`📤 [uploadVehiclePhoto] Intentando path: ${candidatePath}`)
      const { error } = await supabase.storage
        .from('vehicle-photos')
        .upload(candidatePath, bytes, {
          contentType: 'image/jpeg',
          upsert: false, // Don't overwrite - create new file with unique path
        })

      if (!error) {
        uploadedFilePath = candidatePath
        uploadError = null
        console.log(`✅ [uploadVehiclePhoto] Subida exitosa con path: ${candidatePath}`)
        break
      }

      console.warn(`⚠️  [uploadVehiclePhoto] Falló path ${candidatePath}:`, error?.message)
      uploadError = error
    }

    if (!uploadedFilePath) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Error al subir la foto: ${uploadError?.message || uploadError}`)
    }

    // Get a stable storage URL for the uploaded vehicle image
    const photoUrl = await getStorageUrl('vehicle-photos', uploadedFilePath, { allowPublicUrl: true })
    console.log('✅ [uploadVehiclePhoto] URL generada:', photoUrl.substring(0, 100) + '...')

    if (routeId) {
      try {
        console.log('📝 [uploadVehiclePhoto] Actualizando routes con routeId:', routeId)
        const { error: dbError, data: updateData } = await supabase
          .from('routes')
          .update({ vehicle_photo_url: photoUrl })
          .eq('id', routeId)
          .select()

        if (dbError) {
          console.error('❌ Error updating route vehicle photo URL:', dbError)
        } else {
          console.log('✅ [uploadVehiclePhoto] Routes actualizado exitosamente:', updateData)
        }
      } catch (dbErr) {
        console.error('❌ Error saving route vehicle photo URL:', dbErr)
      }
    } else {
      console.log('ℹ️  [uploadVehiclePhoto] No routeId provided, skipping routes update')
    }

    // ✅ NUEVO: Guardar vehicle_photo_url en profiles (para caching)
    try {
      console.log('📝 [uploadVehiclePhoto] Actualizando profiles con driverId:', driverId)
      const { error: profileError, data: profileData } = await supabase
        .from('profiles')
        .update({ vehicle_photo_url: photoUrl })
        .eq('id', driverId)
        .select()

      if (profileError) {
        console.error('❌ Error updating profile vehicle photo URL:', profileError)
      } else {
        console.log('✅ [uploadVehiclePhoto] Guardada en profiles:', photoUrl.substring(0, 100) + '...')
      }
    } catch (profileErr) {
      console.error('❌ Error saving profile vehicle photo URL:', profileErr)
    }

    return photoUrl
  } catch (error) {
    console.error('Error uploading vehicle photo:', error)
    throw error
  }
}

/**
 * Delete a photo and update database
 */
export async function deleteProfilePhoto(userId: string, photoUrl: string): Promise<boolean> {
  try {
    // Extract file path from URL
    const url = new URL(photoUrl)
    const pathInBucket = decodeURIComponent(url.pathname.split('/storage/v1/object/public/profile-photos/')[1] || '')

    if (!pathInBucket) {
      throw new Error('No se pudo extraer la ruta de la foto')
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('profile-photos')
      .remove([pathInBucket])

    if (deleteError) {
      console.error('Storage delete error:', deleteError)
      throw new Error(`Error al eliminar la foto: ${deleteError.message}`)
    }

    // Clear from database
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ avatar_url: null, profile_photo_url: null })
      .eq('id', userId)

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error(`Error al actualizar perfil: ${dbError.message}`)
    }

    return true
  } catch (error) {
    console.error('Error deleting profile photo:', error)
    throw error
  }
}
