import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import {
  getPendingDocumentsForVerification,
  approveDocument,
  rejectDocument,
  DriverDocument,
} from '../services/driverDocuments'

interface DocumentWithDriver extends DriverDocument {
  driver_name?: string
}

export const AdminDashboardScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [documents, setDocuments] = useState<DocumentWithDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<DocumentWithDriver | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadPendingDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      const docs = await getPendingDocumentsForVerification()
      setDocuments(docs)
    } catch (err: any) {
      setError(err.message || 'Error al cargar documentos')
      Alert.alert('Error', err.message || 'No tienes acceso a esta sección')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendingDocuments()
  }, [])

  const handleApprove = async (documentId: string) => {
    Alert.alert('Confirmar', '¿Aprobar este documento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar',
        style: 'default',
        onPress: async () => {
          try {
            setActionLoading(true)
            const success = await approveDocument(documentId)
            if (success) {
              Alert.alert('✅ Éxito', 'Documento aprobado')
              loadPendingDocuments()
              setSelectedDoc(null)
            }
          } catch (err: any) {
            Alert.alert('Error', err.message)
          } finally {
            setActionLoading(false)
          }
        },
      },
    ])
  }

  const handleReject = async () => {
    if (!selectedDoc || !rejectionReason.trim()) {
      Alert.alert('Error', 'Debes ingresar una razón de rechazo')
      return
    }

    try {
      setActionLoading(true)
      const success = await rejectDocument(selectedDoc.id, rejectionReason)
      if (success) {
        Alert.alert('✅ Rechazado', 'El conductor será notificado')
        setShowRejectModal(false)
        setRejectionReason('')
        loadPendingDocuments()
        setSelectedDoc(null)
      }
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cedula: '🆔 Cédula',
      licencia: '📋 Licencia',
      soat: '🚗 SOAT',
      tecnomecanica: '⚙️ Tecnomecánica',
      antecedentes: '📜 Antecedentes',
    }
    return labels[type] || type
  }

  const renderDocument = ({ item }: { item: DocumentWithDriver }) => (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={() => setSelectedDoc(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.docType}>{getDocumentTypeLabel(item.document_type)}</Text>
          <Text style={styles.driverName}>{item.driver_name}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>⏳ PENDIENTE</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <Text style={styles.detailRow}>
          📅 Subido: {new Date(item.uploaded_at).toLocaleDateString()}
        </Text>
        <Text style={styles.detailRow}>
          📦 Archivo: {item.file_name}
        </Text>
      </View>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#154AA8" />
          <Text style={styles.loadingText}>Cargando documentos...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Error de Acceso</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadPendingDocuments}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>👮 Panel Administrativo</Text>
          <Text style={styles.headerSubtitle}>
            {documents.length} documento{documents.length !== 1 ? 's' : ''} pendiente{documents.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.analyticsBtn}
          onPress={() => navigation.navigate('RatingAnalytics' as never)}
        >
          <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {documents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>✅ Sin documentos pendientes</Text>
          <Text style={styles.emptySubtitle}>
            Todo está aprobado y actualizado
          </Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          renderItem={renderDocument}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadPendingDocuments}
        />
      )}

      {/* MODAL: Ver detalle y acciones */}
      <Modal
        visible={!!selectedDoc && !showRejectModal}
        animationType="slide"
        onRequestClose={() => setSelectedDoc(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedDoc(null)}>
              <Text style={styles.closeButton}>✕ Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Verificar Documento</Text>
            <View style={{ width: 60 }} />
          </View>

          {selectedDoc && (
            <View style={styles.modalContent}>
              {/* Información del conductor */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>👤 Conductor</Text>
                <Text style={styles.sectionValue}>{selectedDoc.driver_name}</Text>
              </View>

              {/* Información del documento */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📄 Documento</Text>
                <Text style={styles.sectionValue}>
                  {getDocumentTypeLabel(selectedDoc.document_type)}
                </Text>
                <Text style={styles.sectionValue} numberOfLines={1}>
                  Archivo: {selectedDoc.file_name}
                </Text>
                <Text style={styles.sectionValue}>
                  Tamaño: {(selectedDoc.file_size || 0 / 1024 / 1024).toFixed(2)} MB
                </Text>
              </View>

              {/* Fechas */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📅 Registro</Text>
                <Text style={styles.sectionValue}>
                  Subido: {new Date(selectedDoc.uploaded_at).toLocaleString()}
                </Text>
              </View>

              {/* Botones de acción */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.approveButton]}
                  onPress={() => handleApprove(selectedDoc!.id)}
                  disabled={actionLoading}
                >
                  <Text style={styles.buttonText}>
                    {actionLoading ? '⏳ Procesando...' : '✅ Aprobar'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.rejectButton]}
                  onPress={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                >
                  <Text style={styles.buttonText}>
                    {actionLoading ? '⏳ Procesando...' : '❌ Rechazar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* MODAL: Rechazar con razón */}
      <Modal
        visible={showRejectModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModal}>
            <Text style={styles.rejectTitle}>❌ Rechazar Documento</Text>
            <Text style={styles.rejectSubtitle}>
              Ingresa la razón del rechazo
            </Text>

            <TextInput
              style={styles.rejectInput}
              placeholder="Ej: Documento expirado, no legible, inapropiado..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={styles.rejectButtons}>
              <TouchableOpacity
                style={[styles.rejectActionButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                }}
              >
                <Text style={styles.rejectActionText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rejectActionButton, styles.confirmRejectButton]}
                onPress={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
              >
                <Text style={styles.rejectActionText}>
                  {actionLoading ? 'Procesando...' : 'Rechazar'}
                </Text>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#154AA8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ddd',
  },
  analyticsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#154AA8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#154AA8',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  documentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
  },
  docType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#154AA8',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  detailRow: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#154AA8',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#154AA8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#154AA8',
    marginBottom: 8,
  },
  sectionValue: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#fff',
  },
  // Reject modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  rejectModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 20,
  },
  rejectTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 8,
  },
  rejectSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
  },
  rejectButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e5e5e5',
  },
  confirmRejectButton: {
    backgroundColor: '#EF4444',
  },
  rejectActionText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
})
