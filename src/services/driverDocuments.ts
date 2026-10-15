import { supabase } from './supabase'

/**
 * Sanitize file name to remove invalid characters for Supabase Storage
 * Replaces special characters, spaces, and accents with safe alternatives
 */
function sanitizeFileName(fileName: string): string {
  return (
    fileName
      // Replace accented characters (ü -> u, á -> a, etc.)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Replace spaces with hyphens
      .replace(/\s+/g, '-')
      // Replace em-dash and other special dashes
      .replace(/[—–-]/g, '-')
      // Remove or replace invalid characters
      .replace(/[^a-zA-Z0-9._-]/g, '')
      // Remove consecutive hyphens
      .replace(/--+/g, '-')
      // Trim leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
  )
}

/**
 * Convert file URI to Uint8Array using Fetch API + FileReader
 * Compatible with both iOS and Android
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

export interface DriverDocument {
  id: string
  driver_id: string
  document_type: string
  file_path: string | null
  file_name: string | null
  file_size: number | null
  file_type: string | null
  status: 'pending' | 'verifying' | 'verified' | 'rejected' | 'expired'
  rejection_reason: string | null
  uploaded_at: string
  verified_at: string | null
  expiry_date: string | null
  created_at: string
  updated_at: string
}

/**
 * Upload a driver document to Supabase Storage and create a record in the database
 * @param driverId - User ID (driver)
 * @param documentType - Type of document (cedula, licencia, soat, tecnomecanica, antecedentes)
 * @param fileUri - Local URI of the file to upload
 * @param fileName - Name of the file
 * @param fileSize - Size of the file in bytes
 * @param mimeType - MIME type of the file
 */
const VEHICLE_DOCUMENT_TYPES = ['tarjeta_propiedad', 'soat', 'tecnomecanica']

export async function uploadDriverDocument(
  driverId: string,
  documentType: string,
  fileUri: string,
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<DriverDocument | null> {
  try {
    // Validate that the provided driverId matches the authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (!authUser || authUser.id !== driverId) {
      throw new Error('No tienes permiso para subir documentos como este usuario')
    }

    // Read the file content using Fetch API (cross-platform compatible)
    const bytes = await uriToUint8Array(fileUri)

    // Sanitize the file name to remove invalid characters for Supabase Storage
    const sanitizedFileName = sanitizeFileName(fileName)
    if (!sanitizedFileName) {
      throw new Error('El nombre del archivo es inválido después de sanitización')
    }

    // Create a unique file path: drivers/{driverId}/{documentType}/{timestamp}-{fileName}
    const timestamp = Date.now()
    const filePath = `drivers/${driverId}/${documentType}/${timestamp}-${sanitizedFileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('driver-documents')
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Error al subir el archivo: ${uploadError.message}`)
    }

    // Check if a document of this type already exists and delete it
    const { data: existingDoc } = await supabase
      .from('driver_documents')
      .select('id, file_path')
      .eq('driver_id', driverId)
      .eq('document_type', documentType)
      .single()

    if (existingDoc?.file_path) {
      // Delete the old file from storage
      await supabase.storage
        .from('driver-documents')
        .remove([existingDoc.file_path])
        .catch((err) => console.warn('Could not delete old file:', err))
    }

    let vehicleId: string | null = null
    if (VEHICLE_DOCUMENT_TYPES.includes(documentType)) {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('driver_id', driverId)
        .in('status', ['pending', 'verified'])
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!vehicle) {
        throw new Error('Registra tu vehículo antes de subir sus documentos')
      }
      vehicleId = vehicle.id
    }

    // Insert or update the document record in the database
    const { data, error } = await supabase
      .from('driver_documents')
      .upsert(
        [
          {
            driver_id: driverId,
            document_type: documentType,
            vehicle_id: vehicleId,
            file_path: filePath,
            file_name: sanitizedFileName,
            file_size: fileSize,
            file_type: mimeType,
            status: 'verifying', // Just uploaded, now pending verification by admin
            rejection_reason: null,
            uploaded_at: new Date().toISOString(),
            verified_at: null,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'driver_id,document_type' }
      )
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Error al guardar el documento: ${error.message}`)
    }

    return data as DriverDocument
  } catch (error) {
    console.error('Error uploading document:', error)
    throw error
  }
}

/**
 * Get all documents for a driver
 */
export async function getDriverDocuments(driverId: string): Promise<DriverDocument[]> {
  try {
    // Validate that the provided driverId matches the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== driverId) {
      console.warn('Intento de acceso no autorizado a documentos')
      return []
    }

    const { data, error } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      return []
    }

    return (data as DriverDocument[]) || []
  } catch (error) {
    console.error('Error:', error)
    return []
  }
}

/**
 * Get a specific document for a driver
 */
export async function getDriverDocument(
  driverId: string,
  documentType: string
): Promise<DriverDocument | null> {
  try {
    // Validate that the provided driverId matches the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== driverId) {
      console.warn('Intento de acceso no autorizado a documento')
      return null
    }

    const { data, error } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', driverId)
      .eq('document_type', documentType)
      .single()

    if (error) {
      console.warn('Document not found:', error)
      return null
    }

    return (data as DriverDocument) || null
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}

/**
 * Delete a document (used for replacement)
 */
export async function deleteDriverDocument(documentId: string): Promise<boolean> {
  try {
    // Validate that the authenticated user owns this document
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    // First, fetch the document to verify ownership
    const { data: document, error: fetchError } = await supabase
      .from('driver_documents')
      .select('driver_id')
      .eq('id', documentId)
      .single()

    if (fetchError || !document || document.driver_id !== user.id) {
      throw new Error('No tienes permiso para eliminar este documento')
    }

    const { error } = await supabase
      .from('driver_documents')
      .delete()
      .eq('id', documentId)

    return !error
  } catch (error) {
    console.error('Error deleting document:', error)
    return false
  }
}

