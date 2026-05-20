import { supabase } from './supabase'

export interface DriverApprovalStatus {
  isDriver: boolean
  isVerified: boolean
  allDocumentsApproved: boolean
  pendingDocuments: string[]
  canCreateRoutes: boolean
}

/**
 * Check if a driver is approved and can create routes
 * Requirements:
 * 1. User role must be 'driver'
 * 2. is_driver_verified must be true
 * 3. All required documents must be approved (status = 'verified')
 */
export async function checkDriverApprovalStatus(userId: string): Promise<DriverApprovalStatus> {
  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_driver_verified')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError)
      return {
        isDriver: false,
        isVerified: false,
        allDocumentsApproved: false,
        pendingDocuments: [],
        canCreateRoutes: false,
      }
    }

    const isDriver = profile.role === 'driver'
    const isVerified = profile.is_driver_verified === true

    if (!isDriver) {
      return {
        isDriver: false,
        isVerified: false,
        allDocumentsApproved: false,
        pendingDocuments: [],
        canCreateRoutes: false,
      }
    }

    // Get driver documents
    const { data: documents, error: docsError } = await supabase
      .from('driver_documents')
      .select('document_type, status')
      .eq('driver_id', userId)

    if (docsError) {
      console.error('Error fetching documents:', docsError)
    }

    // Required documents
    const requiredDocs = ['cedula', 'licencia', 'soat', 'tecnomecanica', 'antecedentes']
    const pendingDocuments: string[] = []

    // Check if all required documents are verified
    const approvedDocs = documents?.filter((doc) => doc.status === 'verified') || []
    const approvedDocTypes = approvedDocs.map((doc) => doc.document_type)

    requiredDocs.forEach((docType) => {
      if (!approvedDocTypes.includes(docType)) {
        pendingDocuments.push(docType)
      }
    })

    const allDocumentsApproved = pendingDocuments.length === 0

    return {
      isDriver,
      isVerified,
      allDocumentsApproved,
      pendingDocuments,
      canCreateRoutes: isDriver && isVerified && allDocumentsApproved,
    }
  } catch (error) {
    console.error('Error checking driver approval status:', error)
    return {
      isDriver: false,
      isVerified: false,
      allDocumentsApproved: false,
      pendingDocuments: [],
      canCreateRoutes: false,
    }
  }
}

/**
 * Check if a user has all required documents approved (for role switching)
 * This checks ONLY documents, not current role
 */
export async function hasAllDocumentsApproved(userId: string): Promise<{ approved: boolean; pendingDocuments: string[] }> {
  try {
    // Get driver documents
    const { data: documents, error: docsError } = await supabase
      .from('driver_documents')
      .select('document_type, status')
      .eq('driver_id', userId)

    if (docsError) {
      console.error('Error fetching documents:', docsError)
      return { approved: false, pendingDocuments: [] }
    }

    // Required documents
    const requiredDocs = ['cedula', 'licencia', 'soat', 'tecnomecanica', 'antecedentes']
    const pendingDocuments: string[] = []

    // Check if all required documents are verified
    const approvedDocs = documents?.filter((doc) => doc.status === 'verified') || []
    const approvedDocTypes = approvedDocs.map((doc) => doc.document_type)

    requiredDocs.forEach((docType) => {
      if (!approvedDocTypes.includes(docType)) {
        pendingDocuments.push(docType)
      }
    })

    const approved = pendingDocuments.length === 0

    return { approved, pendingDocuments }
  } catch (error) {
    console.error('Error checking if documents are approved:', error)
    return { approved: false, pendingDocuments: [] }
  }
}

/**
 * Get a user-friendly message about why they can't create routes
 */
export function getDriverRestrictionMessage(status: DriverApprovalStatus): string {
  if (!status.isDriver) {
    return 'Solo los conductores pueden crear rutas'
  }

  if (!status.isVerified) {
    return 'Tu cuenta de conductor aún no ha sido verificada. Por favor, completa documentación requerida.'
  }

  if (status.pendingDocuments.length > 0) {
    const pendingList = status.pendingDocuments.join(', ')
    return `Faltan documentos por aprobar: ${pendingList}`
  }

  return 'No puedes crear rutas en este momento'
}
