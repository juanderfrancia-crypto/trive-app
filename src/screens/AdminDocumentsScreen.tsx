import { useState, useEffect, useCallback } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import * as WebBrowser from 'expo-web-browser'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import {
  getPendingDocumentsForVerification,
  getProcessedDocumentsForAdmin,
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

type Tab = 'pending' | 'history'

const DOCUMENT_LABELS: Record<string, string> = {
  cedula:        'Cédula de Ciudadanía',
  licencia:      'Licencia de Conducción',
  soat:          'SOAT',
  tecnomecanica: 'Tecnomecánica',
  antecedentes:  'Antecedentes Penales',
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: string }> = {
  verified: { label: 'Verificado',  color: COLORS.success,   icon: 'checkmark-circle' },
  rejected: { label: 'Rechazado',   color: COLORS.error,     icon: 'close-circle' },
  expired:  { label: 'Vencido',     color: COLORS.error,     icon: 'alert-circle' },
  verifying:{ label: 'Pendiente',   color: COLORS.warning,   icon: 'time-outline' },
}

const isPdf = (doc: DocumentWithDriver) =>
  doc.file_type === 'application/pdf' || (doc.file_name?.toLowerCase().endsWith('.pdf') ?? false)

export default function AdminDocumentsScreen() {
  const navigation = useNavigation()
  const { handleError, handleSupabaseError } = useErrorHandler()

  const [activeTab, setActiveTab] = useState<Tab>('pending')

  const [pendingDocs, setPendingDocs]   = useState<DocumentWithDriver[]>([])
  const [historyDocs, setHistoryDocs]   = useState<DocumentWithDriver[]>([])
  const [loading, setLoading]           = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyLoaded, setHistoryLoaded]   = useState(false)

  const [processingId, setProcessingId]       = useState<string | null>(null)
  const [selectedDoc, setSelectedDoc]         = useState<DocumentWithDriver | null>(null)
  const [documentUrl, setDocumentUrl]         = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview]   = useState(false)

  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const [showExpiryModal, setShowExpiryModal] = useState(false)
  const [expiryDateInput, setExpiryDateInput] = useState('')
  const [docToApprove, setDocToApprove]       = useState<string | null>(null)

  useEffect(() => { loadPending() }, [])

  const loadPending = async () => {
    try {
      setLoading(true)
      const docs = await getPendingDocumentsForVerification()
      setPendingDocs(docs)
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los documentos. Verifica permisos de administrador.')
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = useCallback(async () => {
    if (historyLoaded) return
    try {
      setLoadingHistory(true)
      const docs = await getProcessedDocumentsForAdmin()
      setHistoryDocs(docs)
      setHistoryLoaded(true)
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el historial.')
    } finally {
      setLoadingHistory(false)
    }
  }, [historyLoaded])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    if (tab === 'history') loadHistory()
  }

  // ── Preview ──────────────────────────────────────────────────────────────
  const handleViewDocument = async (doc: DocumentWithDriver) => {
    if (!doc.file_path) {
      Alert.alert('Error', 'El documento no tiene archivo asociado')
      return
    }
    try {
      setLoadingPreview(true)
      const url = await getDocumentDownloadUrl(doc.file_path)
      if (!url) { Alert.alert('Error', 'No se pudo obtener la URL del documento'); return }
      setDocumentUrl(url)

      if (isPdf(doc)) {
        // PDFs: abrir directo en navegador in-app, sin modal de preview
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        })
        // Después de cerrar el PDF, si es doc pendiente mostramos modal de acción
        if (doc.status === 'verifying') setSelectedDoc(doc)
      } else {
        setSelectedDoc(doc)
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la vista previa del documento')
    } finally {
      setLoadingPreview(false)
    }
  }

  // ── Approve ───────────────────────────────────────────────────────────────
  const DOCS_WITH_EXPIRY = ['licencia', 'soat', 'tecnomecanica']

  const handleApprove = (documentId: string) => {
    setDocToApprove(documentId)
    const doc = pendingDocs.find((d) => d.id === documentId)
    if (!DOCS_WITH_EXPIRY.includes(doc?.document_type ?? '')) {
      confirmApproval(documentId, null)
    } else {
      setExpiryDateInput('')
      setShowExpiryModal(true)
    }
  }

  const confirmApproval = async (documentId: string, expiry: string | null) => {
    try {
      setProcessingId(documentId)
      await approveDocument(documentId, expiry ?? undefined)
      const approved = pendingDocs.find((d) => d.id === documentId)
      setPendingDocs((prev) => prev.filter((d) => d.id !== documentId))
      if (approved) {
        setHistoryDocs((prev) => [{ ...approved, status: 'verified', expiry_date: expiry, verified_at: new Date().toISOString() }, ...prev])
      }
      setSelectedDoc(null)
      setShowExpiryModal(false)
      setDocToApprove(null)
      setExpiryDateInput('')
      Alert.alert('✓ Aprobado', 'Documento aprobado. El conductor será notificado.')
    } catch (error) {
      Alert.alert('Error', 'No se pudo aprobar el documento')
    } finally {
      setProcessingId(null)
    }
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!selectedDoc) return
    const validation = validateMinLength(rejectionReason, 5, 'Razón del rechazo')
    if (!validation.valid) {
      handleError(validation.error ?? 'Razón del rechazo es requerida', ErrorType.VALIDATION)
      return
    }
    try {
      setProcessingId(selectedDoc.id)
      await rejectDocument(selectedDoc.id, rejectionReason)
      const rejected = selectedDoc
      setPendingDocs((prev) => prev.filter((d) => d.id !== rejected.id))
      setHistoryDocs((prev) => [{ ...rejected, status: 'rejected', rejection_reason: rejectionReason }, ...prev])
      setShowRejectModal(false)
      setSelectedDoc(null)
      setRejectionReason('')
      Alert.alert('✓ Rechazado', 'Documento rechazado. El conductor será notificado para resubir.')
    } catch (error) {
      handleSupabaseError(error, 'reject_document', { documentId: selectedDoc.id })
    } finally {
      setProcessingId(null)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const validateAndFormatDate = (input: string): string | null => {
    const s = input.trim()
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
      const [y, m, d] = s.split('-')
      const date = new Date(+y, +m - 1, +d)
      if (!isNaN(date.getTime()) && date >= new Date())
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    const alt = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    if (alt) {
      const [, d, m, y] = alt
      const date = new Date(+y, +m - 1, +d)
      if (!isNaN(date.getTime()) && date >= new Date())
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    return null
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const formatDateShort = (dateString?: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>Cargando documentos...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
          <Text style={s.backBtnText}>Atrás</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Verificación de Documentos</Text>
          <Text style={s.headerSub}>
            {activeTab === 'pending'
              ? `${pendingDocs.length} pendiente${pendingDocs.length !== 1 ? 's' : ''} de revisar`
              : `${historyDocs.length} procesado${historyDocs.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'pending' && s.tabActive]}
          onPress={() => handleTabChange('pending')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'pending' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[s.tabText, activeTab === 'pending' && s.tabTextActive]}>
            Pendientes
          </Text>
          {pendingDocs.length > 0 && (
            <View style={s.tabBadge}>
              <Text style={s.tabBadgeText}>{pendingDocs.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tab, activeTab === 'history' && s.tabActive]}
          onPress={() => handleTabChange('history')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="checkmark-done-outline"
            size={16}
            color={activeTab === 'history' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[s.tabText, activeTab === 'history' && s.tabTextActive]}>
            Historial
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── TAB: PENDIENTES ── */}
      {activeTab === 'pending' && (
        pendingDocs.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.success} />
            <Text style={s.emptyTitle}>¡Todo al día!</Text>
            <Text style={s.emptyText}>No hay documentos pendientes de verificación</Text>
          </View>
        ) : (
          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {pendingDocs.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={[s.card, SHADOWS.md]}
                onPress={() => handleViewDocument(doc)}
                activeOpacity={0.7}
              >
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.docType}>{DOCUMENT_LABELS[doc.document_type] ?? doc.document_type}</Text>
                    <Text style={s.driverName}>{doc.driver_name}</Text>
                  </View>
                  <View style={s.cardHeaderRight}>
                    {isPdf(doc) && (
                      <View style={s.pdfBadge}>
                        <Text style={s.pdfBadgeText}>PDF</Text>
                      </View>
                    )}
                    <View style={[s.statusBadge, { backgroundColor: COLORS.warning + '20' }]}>
                      <Ionicons name="time-outline" size={14} color={COLORS.warning} />
                      <Text style={[s.statusText, { color: COLORS.warning }]}>Pendiente</Text>
                    </View>
                    <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
                  </View>
                </View>

                <View style={s.metaRow}>
                  <View style={s.metaItem}>
                    <Ionicons name="document-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={s.metaText} numberOfLines={1}>{doc.file_name}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Ionicons name="albums-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={s.metaText}>{formatFileSize(doc.file_size)}</Text>
                  </View>
                </View>
                <View style={s.metaRow}>
                  <View style={s.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={s.metaText}>{formatDate(doc.uploaded_at)}</Text>
                  </View>
                </View>

                <Text style={s.tapHint}>
                  {isPdf(doc) ? 'Toca para abrir el PDF' : 'Toca para ver el documento'}
                </Text>

                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={[s.btn, s.rejectBtn]}
                    onPress={() => { setSelectedDoc(doc); setShowRejectModal(true) }}
                    disabled={processingId === doc.id}
                  >
                    {processingId === doc.id
                      ? <ActivityIndicator size="small" color={COLORS.error} />
                      : <><Ionicons name="close-circle-outline" size={16} color={COLORS.error} /><Text style={[s.btnText, { color: COLORS.error }]}>Rechazar</Text></>}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.btn, s.approveBtn]}
                    onPress={() => handleApprove(doc.id)}
                    disabled={processingId === doc.id}
                  >
                    {processingId === doc.id
                      ? <ActivityIndicator size="small" color={COLORS.success} />
                      : <><Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} /><Text style={[s.btnText, { color: COLORS.success }]}>Aprobar</Text></>}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
            <View style={{ height: SPACING.lg }} />
          </ScrollView>
        )
      )}

      {/* ── TAB: HISTORIAL ── */}
      {activeTab === 'history' && (
        loadingHistory ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={s.loadingText}>Cargando historial...</Text>
          </View>
        ) : historyDocs.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="receipt-outline" size={56} color={COLORS.textTertiary} />
            <Text style={s.emptyTitle}>Sin historial</Text>
            <Text style={s.emptyText}>Los documentos procesados aparecerán aquí</Text>
          </View>
        ) : (
          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {historyDocs.map((doc) => {
              const info = STATUS_INFO[doc.status] ?? STATUS_INFO.verifying
              return (
                <View key={doc.id} style={[s.histCard, SHADOWS.sm]}>
                  <View style={s.histCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.docType}>{DOCUMENT_LABELS[doc.document_type] ?? doc.document_type}</Text>
                      <Text style={s.driverName}>{doc.driver_name}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: info.color + '20' }]}>
                      <Ionicons name={info.icon as any} size={14} color={info.color} />
                      <Text style={[s.statusText, { color: info.color }]}>{info.label}</Text>
                    </View>
                  </View>

                  <View style={s.histMeta}>
                    <View style={s.histMetaItem}>
                      <Text style={s.histMetaLabel}>Procesado</Text>
                      <Text style={s.histMetaValue}>{formatDateShort(doc.verified_at ?? doc.updated_at)}</Text>
                    </View>
                    {doc.expiry_date && (
                      <View style={s.histMetaItem}>
                        <Text style={s.histMetaLabel}>Vence</Text>
                        <Text style={s.histMetaValue}>{formatDateShort(doc.expiry_date)}</Text>
                      </View>
                    )}
                    <View style={s.histMetaItem}>
                      <Text style={s.histMetaLabel}>Subido</Text>
                      <Text style={s.histMetaValue}>{formatDateShort(doc.uploaded_at)}</Text>
                    </View>
                  </View>

                  {doc.status === 'rejected' && doc.rejection_reason && (
                    <View style={s.rejectionBanner}>
                      <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} />
                      <Text style={s.rejectionText} numberOfLines={2}>{doc.rejection_reason}</Text>
                    </View>
                  )}
                </View>
              )
            })}
            <View style={{ height: SPACING.lg }} />
          </ScrollView>
        )
      )}

      {/* ── Modal: Preview imagen ── */}
      <Modal visible={!!(selectedDoc && !showRejectModal && !showExpiryModal)} transparent animationType="slide">
        <SafeAreaView style={s.modalContainer} edges={['top']}>
          <View style={s.modalHeader}>
            <TouchableOpacity
              onPress={() => { setSelectedDoc(null); setDocumentUrl(null) }}
              style={s.modalBackBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
              <Text style={s.modalBackText}>Atrás</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle} numberOfLines={1}>
              {DOCUMENT_LABELS[selectedDoc?.document_type ?? ''] ?? 'Documento'}
            </Text>
            <View style={{ width: 80 }} />
          </View>

          {loadingPreview ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={s.loadingText}>Cargando documento...</Text>
            </View>
          ) : documentUrl ? (
            isPdf(selectedDoc!) ? (
              <View style={s.pdfPreview}>
                <Ionicons name="document-text" size={72} color={COLORS.primary} />
                <Text style={s.pdfPreviewTitle}>Documento PDF</Text>
                <Text style={s.pdfPreviewSub}>{selectedDoc?.file_name}</Text>
                <TouchableOpacity
                  style={s.pdfOpenBtn}
                  onPress={() => WebBrowser.openBrowserAsync(documentUrl!)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="open-outline" size={18} color="#fff" />
                  <Text style={s.pdfOpenBtnText}>Abrir PDF</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.imagePreview}>
                <Image source={{ uri: documentUrl }} style={s.previewImage} resizeMode="contain" />
              </View>
            )
          ) : (
            <View style={s.center}>
              <Ionicons name="document-outline" size={64} color={COLORS.textSecondary} />
              <Text style={s.loadingText}>No se pudo cargar la vista previa</Text>
            </View>
          )}

          {/* Solo mostrar acciones si el doc es pendiente */}
          {selectedDoc?.status === 'verifying' && (
            <View style={s.modalFooter}>
              <View style={s.docDetails}>
                <Text style={s.detailLabel}>Conductor</Text>
                <Text style={s.detailValue}>{selectedDoc?.driver_name}</Text>
                <Text style={s.detailLabel}>Archivo</Text>
                <Text style={s.detailValue}>{selectedDoc?.file_name}</Text>
                <Text style={s.detailLabel}>Tamaño</Text>
                <Text style={s.detailValue}>{formatFileSize(selectedDoc?.file_size ?? null)}</Text>
              </View>
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={[s.btn, s.rejectBtn, { flex: 1 }]}
                  onPress={() => setShowRejectModal(true)}
                  disabled={processingId === selectedDoc?.id}
                >
                  {processingId === selectedDoc?.id
                    ? <ActivityIndicator size="small" color={COLORS.error} />
                    : <><Ionicons name="close-circle-outline" size={16} color={COLORS.error} /><Text style={[s.btnText, { color: COLORS.error }]}>Rechazar</Text></>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btn, s.approveBtn, { flex: 1 }]}
                  onPress={() => selectedDoc && handleApprove(selectedDoc.id)}
                  disabled={processingId === selectedDoc?.id}
                >
                  {processingId === selectedDoc?.id
                    ? <ActivityIndicator size="small" color={COLORS.success} />
                    : <><Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} /><Text style={[s.btnText, { color: COLORS.success }]}>Aprobar</Text></>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Modal: Fecha de vencimiento ── */}
      <Modal visible={showExpiryModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.sheet, SHADOWS.lg]}>
            <Text style={s.sheetTitle}>Fecha de Vencimiento</Text>
            <Text style={s.sheetSub}>Ingresa la fecha en que vence este documento</Text>
            <TextInput
              style={s.input}
              placeholder="DD/MM/YYYY o YYYY-MM-DD"
              placeholderTextColor={COLORS.textSecondary}
              value={expiryDateInput}
              onChangeText={setExpiryDateInput}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={s.inputHint}>Formatos: DD/MM/YYYY · DD-MM-YYYY · YYYY-MM-DD</Text>
            <View style={s.sheetActions}>
              <TouchableOpacity
                style={[s.sheetBtn, s.cancelBtn]}
                onPress={() => { setShowExpiryModal(false); setExpiryDateInput(''); setDocToApprove(null) }}
              >
                <Text style={s.sheetBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sheetBtn, s.confirmBtn, !expiryDateInput.trim() && { opacity: 0.4 }]}
                onPress={() => {
                  if (!docToApprove) return
                  const formatted = validateAndFormatDate(expiryDateInput)
                  if (!formatted) { Alert.alert('Error', 'Fecha inválida o en el pasado'); return }
                  confirmApproval(docToApprove, formatted)
                }}
                disabled={!expiryDateInput.trim() || processingId !== null}
              >
                <Text style={[s.sheetBtnText, { color: '#fff' }]}>Aprobar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Razón de rechazo ── */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.sheet, SHADOWS.lg]}>
            <Text style={s.sheetTitle}>Razón del Rechazo</Text>
            <Text style={s.sheetSub}>El conductor verá este mensaje y deberá resubir el documento.</Text>
            <TextInput
              style={[s.input, s.inputMultiline]}
              placeholder="Ej: La imagen está borrosa, no se lee el número de documento"
              placeholderTextColor={COLORS.textSecondary}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              maxLength={200}
            />
            <Text style={s.charCount}>{rejectionReason.length}/200</Text>
            <View style={s.sheetActions}>
              <TouchableOpacity
                style={[s.sheetBtn, s.cancelBtn]}
                onPress={() => { setShowRejectModal(false); setRejectionReason('') }}
              >
                <Text style={s.sheetBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sheetBtn, s.rejectConfirmBtn, rejectionReason.trim().length < 5 && { opacity: 0.4 }]}
                onPress={handleReject}
                disabled={rejectionReason.trim().length < 5}
              >
                <Text style={[s.sheetBtnText, { color: '#fff' }]}>Rechazar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  loadingText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: SPACING.md },
  emptyTitle: { ...TYPOGRAPHY.h2, color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.2)' },
  backBtnText: { ...TYPOGRAPHY.label, color: '#fff', fontWeight: '600' },
  headerTitle: { ...TYPOGRAPHY.h2, color: '#fff', marginBottom: 2 },
  headerSub: { ...TYPOGRAPHY.body, color: 'rgba(255,255,255,0.85)' },

  // Tabs
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, backgroundColor: COLORS.surface },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  tabBadge: { backgroundColor: COLORS.error, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // Cards (pending)
  list: { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  docType: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginBottom: 3 },
  driverName: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  pdfBadge: { backgroundColor: COLORS.error + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm },
  pdfBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.error },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.md, gap: 4 },
  statusText: { ...TYPOGRAPHY.bodySmall, fontSize: 11, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, flex: 1 },
  tapHint: { ...TYPOGRAPHY.bodySmall, color: COLORS.primary, fontStyle: 'italic', marginVertical: SPACING.sm },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm, borderRadius: RADIUS.md, gap: 4 },
  rejectBtn: { backgroundColor: COLORS.error + '15' },
  approveBtn: { backgroundColor: COLORS.success + '15' },
  btnText: { ...TYPOGRAPHY.label, fontWeight: '600' },

  // History cards
  histCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  histCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  histMeta: { flexDirection: 'row', gap: SPACING.lg },
  histMetaItem: { flex: 1 },
  histMetaLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 0.5, marginBottom: 2 },
  histMetaValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },
  rejectionBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: SPACING.sm, backgroundColor: COLORS.error + '10', padding: SPACING.sm, borderRadius: RADIUS.sm },
  rejectionText: { flex: 1, fontSize: 12, color: COLORS.error, fontStyle: 'italic' },

  // Preview modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  modalBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.md, backgroundColor: COLORS.primary + '10' },
  modalBackText: { ...TYPOGRAPHY.label, color: COLORS.primary, fontWeight: '600' },
  modalTitle: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary, flex: 1, textAlign: 'center', marginHorizontal: SPACING.sm },
  imagePreview: { flex: 1, padding: SPACING.md },
  previewImage: { width: '100%', height: '100%' },
  pdfPreview: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg },
  pdfPreviewTitle: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },
  pdfPreviewSub: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center' },
  pdfOpenBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.lg, marginTop: SPACING.sm },
  pdfOpenBtnText: { ...TYPOGRAPHY.body, color: '#fff', fontWeight: '700' },
  modalFooter: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, padding: SPACING.md },
  docDetails: { marginBottom: SPACING.md },
  detailLabel: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, textTransform: 'uppercase', marginTop: SPACING.md, marginBottom: 2 },
  detailValue: { ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary },

  // Bottom sheets
  overlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg },
  sheetTitle: { ...TYPOGRAPHY.h2, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  sheetSub: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.md },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, ...TYPOGRAPHY.bodySmall, marginBottom: SPACING.xs },
  inputMultiline: { textAlignVertical: 'top', minHeight: 90 },
  inputHint: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: SPACING.md },
  charCount: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'right', marginBottom: SPACING.md },
  sheetActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs },
  sheetBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  sheetBtnText: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary },
  cancelBtn: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  confirmBtn: { backgroundColor: COLORS.success },
  rejectConfirmBtn: { backgroundColor: COLORS.error },
})
