import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import {
  getPendingDocumentsForVerification,
  approveDocument,
  rejectDocument,
  type DriverDocument,
  getDocumentDownloadUrl,
} from '../services/driverDocuments'
import { validateMinLength } from '../utils/validations'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { ErrorType } from '../services/errorHandler'

interface DocumentWithDriver extends DriverDocument {
  driver_name?: string
}

const DOCUMENT_LABELS: Record<string, string> = {
  cedula: 'Cédula de Ciudadanía',
  licencia: 'Licencia de Conducción',
  soat: 'SOAT',
  tecnomecanica: 'Tecnomecánica',
  antecedentes: 'Antecedentes Penales',
}

export default function AdminDocumentsScreen() {
  const navigation = useNavigation()
  const { handleError, handleSupabaseError } = useErrorHandler()
  const [pendingDocuments, setPendingDocuments] = useState<DocumentWithDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithDriver | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [showExpiryModal, setShowExpiryModal] = useState(false)
  const [expiryDateInput, setExpiryDateInput] = useState('')
  const [documentToApprove, setDocumentToApprove] = useState<string | null>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const docs = await getPendingDocumentsForVerification()
      setPendingDocuments(docs)
    } catch (error) {
      console.error('Error loading documents:', error)
      Alert.alert('Error', 'No se pudieron cargar los documentos. Verifica que tengas permisos de administrador.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDocument = async (doc: DocumentWithDriver) => {
    try {
      setLoadingPreview(true)
      setSelectedDocument(doc)
      console.log('Loading preview for document:', doc.id, 'file_path:', doc.file_path)
      if (doc.file_path) {
        console.log('Fetching signed URL...')
        const url = await getDocumentDownloadUrl(doc.file_path)
        console.log('Signed URL obtained:', url)
        if (!url) {
          Alert.alert('Error', 'No se pudo obtener la URL del documento')
          return
        }
        setDocumentUrl(url)
      } else {
        console.log('Document has no file_path')
        Alert.alert('Error', 'El documento no tiene archivo asociado')
      }
    } catch (error) {
      console.error('Error loading preview:', error)
      Alert.alert('Error', 'No se pudo cargar la vista previa del documento')
    } finally {
      setLoadingPreview(false)
    }
  }

  const documentsWithExpiry = ['licencia', 'soat', 'tecnomecanica']

  const validateAndFormatDate = (input: string): string | null => {
    // Aceptar formatos: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
    const sanitized = input.trim()
    
    // Formato YYYY-MM-DD (correcto)
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(sanitized)) {
      const [year, month, day] = sanitized.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      if (!isNaN(date.getTime()) && date >= new Date()) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
    
    // Formato DD/MM/YYYY o DD-MM-YYYY
    const altMatch = sanitized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    if (altMatch) {
      const [, day, month, year] = altMatch
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      if (!isNaN(date.getTime()) && date >= new Date()) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
    
    return null
  }

  const handleApprove = (documentId: string) => {
    setDocumentToApprove(documentId)
    const doc = pendingDocuments.find(d => d.id === documentId)
    
    // Si es documento sin vencimiento, aprobar directamente sin fecha
    if (!documentsWithExpiry.includes(doc?.document_type || '')) {
      confirmApproval(documentId, null)
    } else {
      // Mostrar modal para ingresar fecha
      setExpiryDateInput('')
      setShowExpiryModal(true)
    }
  }

  const confirmApproval = async (documentId: string, expiry: string | null) => {
    try {
      setProcessingId(documentId)
      await approveDocument(documentId, expiry || undefined)
      setPendingDocuments(prev => prev.filter(doc => doc.id !== documentId))
      setSelectedDocument(null)
      setShowExpiryModal(false)
      setDocumentToApprove(null)
      setExpiryDateInput('')
      Alert.alert('Éxito', 'Documento aprobado. El conductor será notificado.')
      setProcessingId(null)
    } catch (error) {
      console.error('Error approving document:', error)
      Alert.alert('Error', 'No se pudo aprobar el documento')
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!selectedDocument) return

    const reasonValidation = validateMinLength(rejectionReason, 5, 'Razón del rechazo');
    if (!reasonValidation.valid) {
      handleError(reasonValidation.error || 'Razón del rechazo es requerida', ErrorType.VALIDATION);
      return;
    }

    try {
      setProcessingId(selectedDocument.id)
      await rejectDocument(selectedDocument.id, rejectionReason)
      setPendingDocuments(prev => prev.filter(doc => doc.id !== selectedDocument.id))
      setShowRejectModal(false)
      setSelectedDocument(null)
      setRejectionReason('')
      Alert.alert('✓ Éxito', 'Documento rechazado. El conductor será notificado para resubir.')
      setProcessingId(null)
    } catch (error) {
      console.error('Error rejecting document:', error)
      handleSupabaseError(error, 'reject_document', { documentId: selectedDocument.id })
      setProcessingId(null)
    }
  }

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando documentos...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Verificación de Documentos</Text>
          <Text style={styles.headerSubtitle}>{pendingDocuments.length} pendientes de revisar</Text>
        </View>
      </LinearGradient>

      {pendingDocuments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.success} />
          <Text style={styles.emptyTitle}>¡Todo al día!</Text>
          <Text style={styles.emptyText}>No hay documentos pendientes de verificación</Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {pendingDocuments.map(doc => (
            <TouchableOpacity
              key={doc.id}
              style={[styles.documentCard, SHADOWS.md]}
              onPress={() => handleViewDocument(doc)}
              activeOpacity={0.7}
            >
              <View style={styles.documentHeader}>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentType}>{DOCUMENT_LABELS[doc.document_type] || doc.document_type}</Text>
                  <Text style={styles.driverName}>{doc.driver_name}</Text>
                </View>
                <View style={styles.headerIcons}>
                  <View style={[styles.statusBadge, { backgroundColor: COLORS.warning + '20' }]}>
                    <Ionicons name="time-outline" size={16} color={COLORS.warning} />
                    <Text style={[styles.statusText, { color: COLORS.warning }]}>Pendiente</Text>
                  </View>
                  <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
                </View>
              </View>

              <View style={styles.documentMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="document-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">{doc.file_name}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="albums-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.metaText}>{formatFileSize(doc.file_size)}</Text>
                </View>
              </View>

              <View style={styles.documentMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.metaText}>{formatDate(doc.uploaded_at)}</Text>
                </View>
              </View>

              <Text style={styles.tapHint}>Toca para ver el documento completo</Text>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={() => {
                    setSelectedDocument(doc)
                    setShowRejectModal(true)
                  }}
                  disabled={processingId === doc.id}
                >
                  {processingId === doc.id ? (
                    <ActivityIndicator size="small" color={COLORS.error} />
                  ) : (
                    <>
                      <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                      <Text style={[styles.btnText, { color: COLORS.error }]}>Rechazar</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  onPress={() => handleApprove(doc.id)}
                  disabled={processingId === doc.id}
                >
                  {processingId === doc.id ? (
                    <ActivityIndicator size="small" color={COLORS.success} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
                      <Text style={[styles.btnText, { color: COLORS.success }]}>Aprobar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: SPACING.lg }} />
        </ScrollView>
      )}

      {/* Document Preview Modal */}
      <Modal visible={!!(selectedDocument && !showRejectModal)} transparent animationType="slide">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setSelectedDocument(null)}
              style={styles.headerButton}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
              <Text style={styles.headerButtonText}>Atrás</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{DOCUMENT_LABELS[selectedDocument?.document_type || ''] || 'Documento'}</Text>
            <View style={{ width: 80 }} />
          </View>

          {loadingPreview ? (
            <View style={styles.previewLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Cargando documento...</Text>
            </View>
          ) : documentUrl ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: documentUrl }} style={styles.previewImage} />
            </View>
          ) : (
            <View style={styles.previewLoading}>
              <Ionicons name="document-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.loadingText}>No se pudo cargar la vista previa</Text>
            </View>
          )}

          <View style={styles.modalFooter}>
            <View style={styles.documentDetails}>
              <Text style={styles.detailLabel}>Conductor</Text>
              <Text style={styles.detailValue}>{selectedDocument?.driver_name}</Text>

              <Text style={styles.detailLabel}>Archivo</Text>
              <Text style={styles.detailValue}>{selectedDocument?.file_name}</Text>

              <Text style={styles.detailLabel}>Tamaño</Text>
              <Text style={styles.detailValue}>{formatFileSize(selectedDocument?.file_size || null)}</Text>

              <Text style={styles.detailLabel}>Subido</Text>
              <Text style={styles.detailValue}>{formatDate(selectedDocument?.uploaded_at || '')}</Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.rejectBtn, { flex: 1 }]}
                onPress={() => setShowRejectModal(true)}
                disabled={processingId === selectedDocument?.id}
              >
                {processingId === selectedDocument?.id ? (
                  <ActivityIndicator size="small" color={COLORS.error} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                    <Text style={[styles.btnText, { color: COLORS.error }]}>Rechazar</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.approveBtn, { flex: 1 }]}
                onPress={() => selectedDocument && handleApprove(selectedDocument.id)}
                disabled={processingId === selectedDocument?.id}
              >
                {processingId === selectedDocument?.id ? (
                  <ActivityIndicator size="small" color={COLORS.success} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
                    <Text style={[styles.btnText, { color: COLORS.success }]}>Aprobar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Expiry Date Modal */}
      <Modal visible={showExpiryModal} transparent animationType="fade">
        <View style={styles.rejectModalOverlay}>
          <View style={[styles.rejectModalContent, SHADOWS.lg]}>
            <Text style={styles.rejectModalTitle}>Fecha de Vencimiento</Text>
            <Text style={styles.rejectModalSubtitle}>
              Ingresa la fecha en que vence este documento
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="DD/MM/YYYY o YYYY-MM-DD"
              placeholderTextColor={COLORS.textSecondary}
              value={expiryDateInput}
              onChangeText={setExpiryDateInput}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.dateHint}>
              Formatos aceptados: DD/MM/YYYY, DD-MM-YYYY o YYYY-MM-DD
            </Text>

            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowExpiryModal(false)
                  setExpiryDateInput('')
                  setDocumentToApprove(null)
                }}
              >
                <Text style={[styles.modalBtnText, { color: COLORS.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.approveExpiryBtn]}
                onPress={() => {
                  if (documentToApprove) {
                    const formattedDate = validateAndFormatDate(expiryDateInput)
                    if (!formattedDate) {
                      Alert.alert('Error', 'Por favor ingresa una fecha válida (debe ser en el futuro)')
                      return
                    }
                    confirmApproval(documentToApprove, formattedDate)
                  }
                }}
                disabled={processingId !== null || !expiryDateInput.trim()}
              >
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Aprobar Documento</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.rejectModalOverlay}>
          <View style={[styles.rejectModalContent, SHADOWS.lg]}>
            <Text style={styles.rejectModalTitle}>Razón del Rechazo</Text>
            <Text style={styles.rejectModalSubtitle}>
              Especifica por qué se rechaza este documento. El conductor verá este mensaje.
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Ej: La imagen está muy borrosa, no se ve el documento claramente"
              placeholderTextColor={COLORS.textSecondary}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              maxLength={200}
            />

            <Text style={styles.charCount}>{rejectionReason.length}/200</Text>

            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                }}
              >
                <Text style={[styles.modalBtnText, { color: COLORS.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmRejectBtn]}
                onPress={handleReject}
                disabled={rejectionReason.trim().length < 5}
              >
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Rechazar Documento</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButtonText: {
    ...TYPOGRAPHY.label,
    color: '#FFF',
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: '#FFF',
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: '#FFF',
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  documentCard: {
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  documentInfo: {
    flex: 1,
  },
  documentType: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  driverName: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tapHint: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontStyle: 'italic',
    marginVertical: SPACING.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  statusText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  documentMeta: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  rejectBtn: {
    backgroundColor: COLORS.error + '15',
  },
  approveBtn: {
    backgroundColor: COLORS.success + '15',
  },
  btnText: {
    ...TYPOGRAPHY.label,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#FFF',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '10',
  },
  headerButtonText: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: SPACING.sm,
  },
  previewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  modalFooter: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.md,
  },
  documentDetails: {
    marginBottom: SPACING.md,
  },
  detailLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  detailValue: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
  },
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: '#00000060',
    justifyContent: 'flex-end',
  },
  rejectModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  rejectModalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  rejectModalSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodySmall,
    textAlignVertical: 'top',
    marginBottom: SPACING.xs,
  },
  charCount: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  rejectModalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  approveExpiryBtn: {
    backgroundColor: COLORS.success,
  },
  dateHint: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  confirmRejectBtn: {
    backgroundColor: COLORS.error,
  },
  modalBtnText: {
    ...TYPOGRAPHY.h4,
  },
})
