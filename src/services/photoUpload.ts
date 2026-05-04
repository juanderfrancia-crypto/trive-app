import { supabase } from './supabase'

/**
 * Get a stable storage URL for a file.
 * If the bucket is public, use the persistent public URL.
 * Otherwise fall back to a longer-lived signed URL.
 */
const PUBLIC_BUCKETS = new Set(['profile-photos'])

async function getStorageUrl(
  bucket: string,
  filePath: string,
  options?: { allowPublicUrl?: boolean }
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 30) // 30 days

    if (!error && data?.signedUrl) {
      return data.signedUrl
    }

    const allowPublicUrl = options?.allowPublicUrl ?? PUBLIC_BUCKETS.has(bucket)

    if (!allowPublicUrl) {
      throw error || new Error('No se pudo generar la URL de storage')
    }

    const result = await supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    const publicData = result.data

    if (publicData?.publicUrl && !publicData.publicUrl.includes('null')) {
      return publicData.publicUrl
    }

    throw error || new Error('No se pudo generar la URL de storage')
  } catch (err) {
    throw err
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

    console.log('Profile photo URL:', photoUrl)

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
      const url = await getStorageUrl('vehicle-photos', filePath, { allowPublicUrl: false })
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

    // Create candidate file paths - try simpler paths first
    const basePaths = routeId
      ? [
          `vehicle_${driverId}.jpg`, // Simplest: no folder structure
          `${driverId}/vehicle.jpg`, // Driver ID only
          `drivers/${driverId}/vehicle.jpg`, // Standard structure
          `drivers/${driverId}/routes/${routeId}/vehicle.jpg`, // Full structure
        ]
      : [
          `vehicle_${driverId}.jpg`, // Simplest
          `${driverId}/vehicle.jpg`, // Driver ID only
          `drivers/${driverId}/vehicle.jpg`, // Standard structure
        ]

    let uploadedFilePath: string | null = null
    let uploadError: any = null

    for (const candidatePath of basePaths) {
      const { error } = await supabase.storage
        .from('vehicle-photos')
        .upload(candidatePath, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (!error) {
        uploadedFilePath = candidatePath
        uploadError = null
        break
      }

      console.warn(`Vehicle photo upload failed for path ${candidatePath}:`, error)
      uploadError = error
    }

    if (!uploadedFilePath) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Error al subir la foto: ${uploadError?.message || uploadError}`)
    }

    // Get a stable storage URL for the uploaded vehicle image
    const photoUrl = await getStorageUrl('vehicle-photos', uploadedFilePath, { allowPublicUrl: false })

    console.log('Vehicle photo URL:', photoUrl)

    if (routeId) {
      try {
        const { error: dbError } = await supabase
          .from('routes')
          .update({ vehicle_photo_url: photoUrl })
          .eq('id', routeId)

        if (dbError) {
          console.warn('Error updating route vehicle photo URL:', dbError)
        }
      } catch (dbErr) {
        console.warn('Error saving route vehicle photo URL:', dbErr)
      }
    }

    // ✅ NUEVO: Guardar vehicle_photo_url en profiles (para caching)
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ vehicle_photo_url: photoUrl })
        .eq('id', driverId)

      if (profileError) {
        console.warn('Error updating profile vehicle photo URL:', profileError)
      } else {
        console.log('Profile vehicle_photo_url updated successfully')
      }
    } catch (profileErr) {
      console.warn('Error saving profile vehicle photo URL:', profileErr)
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
