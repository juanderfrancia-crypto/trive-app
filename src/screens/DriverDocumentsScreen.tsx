import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import * as DocumentPicker from 'expo-document-picker'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { uploadDriverDocument, getDriverDocuments, type DriverDocument } from '../services/driverDocuments'
import { DOCUMENTS_WITHOUT_EXPIRY } from '../utils/documentHelpers'
import { useCallback } from 'react'
import { supabase } from '../services/supabase'

interface DocumentItem {
  id: string
  documentType: string
  name: string
  icon: string
  description: string
}

const REQUIRED_DOCUMENTS: DocumentItem[] = [
  {
    id: 'cedula',
    documentType: 'cedula',
    name: 'Cédula de Ciudadanía',
    icon: 'document-outline',
    description: 'Identificación válida',
  },
  {
    id: 'licencia',
    documentType: 'licencia',
    name: 'Licencia de Conducción',
    icon: 'card-outline',
    description: 'Categoría B - Vigente',
  },
  {
    id: 'soat',
    documentType: 'soat',
    name: 'SOAT',
    icon: 'shield-checkmark-outline',
    description: 'Seguro Obligatorio de Accidentes de Tránsito',
  },
  {
    id: 'tecnomecanica',
    documentType: 'tecnomecanica',
    name: 'Tecnomecánica',
    icon: 'settings-outline',
    description: 'Revisión técnico-mecánica',
  },
  {
    id: 'antecedentes',
    documentType: 'antecedentes',
    name: 'Certificado de Antecedentes',
    icon: 'checkmark-circle-outline',
    description: 'En proceso de verificación',
  },
]

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'verified':
      return { label: 'Verificado ✓', color: COLORS.success, icon: 'checkmark-circle', bgOpacity: '20' }
    case 'verifying':
      return { label: 'En análisis...', color: COLORS.primary, icon: 'time', bgOpacity: '20' }
    case 'pending':
      return { label: 'Pendiente de subida', color: COLORS.warning, icon: 'time-outline', bgOpacity: '20' }
    case 'rejected':
      return { label: 'Rechazado', color: COLORS.error, icon: 'alert-circle', bgOpacity: '20' }
    default:
      return { label: 'Desconocido', color: COLORS.textSecondary, icon: 'help-circle-outline', bgOpacity: '20' }
  }
}

const getDaysUntilExpiry = (expiryDate?: string) => {
  if (!expiryDate) return null
  const expiry = new Date(expiryDate)
  const today = new Date()
  const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function DriverDocumentsScreen() {
  const navigation = useNavigation()
  const { user, authUser } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [backendDocuments, setBackendDocuments] = useState<Map<string, DriverDocument>>(new Map())

  // Load documents from backend on mount and setup real-time listener
  useEffect(() => {
    if (!authUser?.id) return

    loadDocuments()

    // Subscribe to real-time changes in driver_documents
    const docSubscription = supabase.channel(`driver_documents:${authUser.id}`)
    docSubscription.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'driver_documents',
        filter: `driver_id=eq.${authUser.id}`,
      },
      () => {
        // When any document changes, reload all documents
        console.log('Document change detected, reloading...')
        loadDocuments()
      }
    )
    docSubscription.subscribe()

    // Subscribe to profile changes to detect when verification is complete
    const profileSubscription = supabase.channel(`profiles:${authUser.id}`)
    profileSubscription.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${authUser.id}`,
      },
      (payload: any) => {
        console.log('Profile update detected:', payload)
        // If is_driver_verified just became true, show success message and refresh
        if (payload.new?.is_driver_verified === true && !payload.old?.is_driver_verified) {
          Alert.alert(
            '¡Felicidades! 🎉',
            'Todos tus documentos han sido verificados. ¡Ahora eres un conductor verificado!',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Refresh the user profile in store
                  if (user?.id) {
                    // This will trigger a profile refresh
                    navigation.navigate('Main' as never)
                  }
                },
              },
            ]
          )
        }
      }
    )
    profileSubscription.subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      docSubscription.unsubscribe()
      supabase.removeChannel(docSubscription)
      profileSubscription.unsubscribe()
      supabase.removeChannel(profileSubscription)
    }
  }, [authUser?.id])

  // Reload documents when screen is focused and set up auto-refresh
  useFocusEffect(
    useCallback(() => {
      if (authUser?.id) {
        loadDocuments()
      }
    }, [authUser?.id])
  )

  const loadDocuments = async () => {
    if (!authUser?.id) return
    try {
      setLoading(true)
      const docs = await getDriverDocuments(authUser.id)
      const docMap = new Map<string, DriverDocument>()
      docs.forEach((doc) => {
        docMap.set(doc.document_type, doc)
      })
      setBackendDocuments(docMap)
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get status for each document type
  const getDocumentStatus = (documentType: string) => {
    const backendDoc = backendDocuments.get(documentType)
    return backendDoc?.status || 'pending'
  }

  const getDocumentRejectionReason = (documentType: string) => {
    const backendDoc = backendDocuments.get(documentType)
    return backendDoc?.rejection_reason
  }

  const getDocumentExpiryDate = (documentType: string) => {
    const backendDoc = backendDocuments.get(documentType)
    return backendDoc?.expiry_date
  }

  const getDocumentDescription = (documentType: string, staticDescription: string) => {
    const status = getDocumentStatus(documentType)
    const backendDoc = backendDocuments.get(documentType)
    const hasExpiry = !DOCUMENTS_WITHOUT_EXPIRY.includes(documentType)
    
    if (status === 'pending') {
      return 'Pendiente de subida'
    } else if (status === 'verifying') {
      return 'En análisis por administrador'
    } else if (status === 'verified') {
      // Si está verificado, mostrar si tiene vencimiento o no (solo si aplica)
      if (hasExpiry) {
        const expiryDate = backendDoc?.expiry_date
        if (expiryDate) {
          const expiryInfo = getExpiryInfo(expiryDate)
          return expiryInfo?.label || 'Verificado ✓'
        }
      }
      return 'Verificado ✓'
    } else if (status === 'rejected') {
      return 'Rechazado - resubir'
    }
    
    return staticDescription
  }

  const getExpiryInfo = (expiryDate?: string | null) => {
    if (!expiryDate) return null
    
    const expiry = new Date(expiryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expiry.setHours(0, 0, 0, 0)
    
    const diffTime = expiry.getTime() - today.getTime()
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (daysLeft < 0) {
      return { label: 'VENCIDO', color: COLORS.error, daysLeft: 0, isExpired: true }
    } else if (daysLeft === 0) {
      return { label: 'Vence hoy', color: COLORS.error, daysLeft: 0, isExpired: false }
    } else if (daysLeft <= 30) {
      return { label: `Vence en ${daysLeft} días`, color: COLORS.warning, daysLeft, isExpired: false }
    } else {
      return { label: `Vence en ${daysLeft} días`, color: COLORS.success, daysLeft, isExpired: false }
    }
  }

  // Calculate verification percentage
  const verifiedCount = Array.from(backendDocuments.values()).filter(
    (d) => d.status === 'verified'
  ).length
  const totalDocuments = REQUIRED_DOCUMENTS.length
  const verificationPercentage = Math.round((verifiedCount / totalDocuments) * 100)

  const handleUploadDocument = async (documentType: string, documentName: string) => {
    if (!authUser?.id) {
      Alert.alert('Error', 'No se pudo identificar tu usuario')
      return
    }

    try {
      setUploadingDocType(documentType)

      // Open file picker
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      })

      if (!result.assets || result.assets.length === 0) {
        setUploadingDocType(null)
        return
      }

      const asset = result.assets[0]
      const file = {
        uri: asset.uri,
        name: asset.name || `documento-${documentType}`,
        size: asset.size || 0,
        mimeType: asset.mimeType || 'application/octet-stream',
      }

      // Validate file size (max 10MB)
      const fileSizeInMB = file.size ? file.size / (1024 * 1024) : 0
      if (fileSizeInMB > 10) {
        Alert.alert('Error', 'El archivo no puede pesar más de 10 MB')
        setUploadingDocType(null)
        return
      }

      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.mimeType || '')) {
        Alert.alert('Error', 'Solo se aceptan archivos PDF e imágenes (JPG, PNG, WebP)')
        setUploadingDocType(null)
        return
      }

      // Show confirmation with file details
      const currentStatus = getDocumentStatus(documentType)
      const isRenewal = currentStatus === 'verified'
      
      Alert.alert(
        'Documento Seleccionado',
        isRenewal 
          ? `${file.name}\n\nTamaño: ${fileSizeInMB.toFixed(2)} MB\n\nSe reenviará a verificación. Tu documento actual será reemplazado y revisado nuevamente.`
          : `${file.name}\n\nTamaño: ${fileSizeInMB.toFixed(2)} MB\n\nSe enviará a verificación. Nuestro equipo revisará que sea un documento válido y que corresponda a tu perfil.`,
        [
          {
            text: 'Cancelar',
            onPress: () => setUploadingDocType(null),
            style: 'cancel',
          },
          {
            text: 'Confirmar Subida',
            onPress: async () => {
              try {
                // Upload to backend
                const uploadedDoc = await uploadDriverDocument(
                  authUser.id,
                  documentType,
                  file.uri,
                  file.name,
                  file.size || 0,
                  file.mimeType || 'application/octet-stream'
                )

                if (uploadedDoc) {
                  // Update local state
                  const newMap = new Map(backendDocuments)
                  newMap.set(documentType, uploadedDoc)
                  setBackendDocuments(newMap)

                  Alert.alert(
                    'Éxito',
                    isRenewal
                      ? `Tu ${documentName.toLowerCase()} ha sido actualizada correctamente.\n\nSerá revisada nuevamente por nuestro equipo. Recibirás una notificación cuando esté lista.`
                      : `Tu ${documentName.toLowerCase()} ha sido subida correctamente.\n\nAhora sera revisada por nuestro equipo de verificación. Recibirás una notificación cuando esté lista.`,
                    [{ text: 'Entendido', onPress: () => setUploadingDocType(null) }]
                  )
                }
              } catch (error: any) {
                Alert.alert('Error', error.message || 'No se pudo subir el documento')
                setUploadingDocType(null)
              }
            },
          },
        ]
      )
    } catch (error) {
      console.error('Error al seleccionar documento:', error)
      Alert.alert('Error', 'No se pudo seleccionar el documento. Intenta nuevamente.')
      setUploadingDocType(null)
    }
  }

  // Validación de rol: Conductores O usuarios que están intentando ser conductores
  // Permitimos a pasajeros acceder si vienen del flujo de ProfileScreen para cargar documentos
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.restrictedContainer}>
          {/* Icon */}
          <View style={styles.restrictedIcon}>
            <Ionicons name="lock-closed" size={48} color={COLORS.error} />
          </View>

          {/* Title */}
          <Text style={styles.restrictedTitle}>Acceso restringido</Text>

          {/* Message */}
          <Text style={styles.restrictedText}>
            No pudimos identificar tu cuenta. Por favor, inicia sesión nuevamente.
          </Text>

          {/* Current Role Badge */}
          {user && (
            <View style={styles.roleBadge}>
              <Ionicons 
                name={(user as any).role === 'driver' ? 'car' : 'person'} 
                size={18} 
                color={COLORS.textInverse}
              />
              <Text style={styles.roleBadgeText}>
                Rol actual: {(user as any).role === 'driver' ? 'Conductor' : 'Pasajero'}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.restrictedButtonContainer}>
            <TouchableOpacity
              style={styles.restrictedPrimaryBtn}
              onPress={() => (navigation as any).navigate('Main', { screen: 'Profile' })}
              activeOpacity={0.8}
            >
              <Ionicons name="person-circle" size={20} color={COLORS.textInverse} />
              <Text style={styles.restrictedPrimaryBtnText}>Ir a Perfil y cambiar rol</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restrictedSecondaryBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.restrictedSecondaryBtnText}>Volver atrás</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Documentos</Text>
          <Text style={styles.subtitle}>Gestiona tus documentos</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Verification Progress */}
        <LinearGradient
          colors={[COLORS.primary + 'F5', COLORS.primary + 'A0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.progressCard}
        >
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressLabel}>Verificación completa</Text>
              <Text style={styles.progressValue}>{verificationPercentage}%</Text>
            </View>
            <Text style={styles.progressPercentage}>
              {verifiedCount}/{totalDocuments}
            </Text>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${verificationPercentage}%` },
              ]}
            />
          </View>

          <Text style={styles.progressDescription}>
            {verificationPercentage === 0
              ? 'Sube todos tus documentos para activar tu cuenta como conductor'
              : verificationPercentage === 100
              ? '✓ ¡Todos tus documentos están verificados!'
              : `${totalDocuments - verifiedCount} documento${totalDocuments - verifiedCount > 1 ? 's' : ''} pendiente${totalDocuments - verifiedCount > 1 ? 's' : ''} de verificación`}
          </Text>
        </LinearGradient>

        {/* Documents List */}
        <View style={styles.documentsSection}>
          <Text style={styles.sectionTitle}>Documentos Requeridos</Text>

          {REQUIRED_DOCUMENTS.map((doc, index) => {
            const status = getDocumentStatus(doc.documentType)
            const statusInfo = getStatusInfo(status)
            const rejectionReason = getDocumentRejectionReason(doc.documentType)
            const isUploading = uploadingDocType === doc.documentType

            return (
              <View key={doc.id}>
                <View style={styles.documentCard}>
                  <View style={styles.documentIcon}>
                    <Ionicons
                      name={doc.icon as any}
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName}>{doc.name}</Text>
                    <Text style={styles.documentDescription}>{getDocumentDescription(doc.documentType, doc.description)}</Text>
                  </View>

                  <View style={styles.documentStatus}>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + statusInfo.bgOpacity }]}>
                      <Ionicons
                        name={statusInfo.icon as any}
                        size={16}
                        color={statusInfo.color}
                      />
                      <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>

                    {(status === 'pending' || status === 'rejected' || status === 'verified') && (
                      <TouchableOpacity
                        style={[
                          styles.uploadBtn, 
                          isUploading && styles.uploadBtnLoading,
                          status === 'verified' && styles.renewBtn
                        ]}
                        onPress={() => handleUploadDocument(doc.documentType, doc.name)}
                        disabled={isUploading}
                        activeOpacity={0.8}
                      >
                        {isUploading ? (
                          <ActivityIndicator size="small" color={status === 'verified' ? COLORS.warning : COLORS.primary} />
                        ) : (
                          <Ionicons 
                            name={status === 'verified' ? "refresh-circle-outline" : "cloud-upload-outline"} 
                            size={16} 
                            color={status === 'verified' ? COLORS.warning : COLORS.primary} 
                          />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Expiry Date Info for Verified Documents */}
                {status === 'verified' && !DOCUMENTS_WITHOUT_EXPIRY.includes(doc.documentType) && (
                  <View style={styles.expiryInfoContainer}>
                    {(() => {
                      const expiryDate = getDocumentExpiryDate(doc.documentType)
                      const expiryInfo = getExpiryInfo(expiryDate)
                      
                      if (!expiryInfo) {
                        return null
                      }

                      return (
                        <View style={[
                          styles.expiryBadge,
                          { 
                            backgroundColor: expiryInfo.color + '20',
                            borderColor: expiryInfo.color,
                            borderWidth: 1
                          }
                        ]}>
                          <Ionicons 
                            name={expiryInfo.isExpired ? "alert-circle" : "calendar"} 
                            size={16} 
                            color={expiryInfo.color} 
                          />
                          <Text style={[styles.expiryText, { color: expiryInfo.color }]}>
                            {expiryInfo.label}
                          </Text>
                        </View>
                      )
                    })()}
                  </View>
                )}

                {/* Rejection reason if document was rejected */}
                {status === 'rejected' && rejectionReason && (
                  <View style={styles.rejectionBanner}>
                    <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                    <View style={styles.rejectionContent}>
                      <Text style={styles.rejectionTitle}>Documento Rechazado</Text>
                      <Text style={styles.rejectionReason}>{rejectionReason}</Text>
                      <Text style={styles.rejectionSubtext}>Por favor, sube nuevamente tu documento</Text>
                    </View>
                  </View>
                )}

                {/* Verifying info if document is being reviewed */}
                {status === 'verifying' && (
                  <View style={styles.verifyingBanner}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.verifyingText}>
                      Nuestro equipo está revisando tu documento...
                    </Text>
                  </View>
                )}

                {index < REQUIRED_DOCUMENTS.length - 1 && <View style={styles.divider} />}
              </View>
            )
          })}
        </View>

        {/* Important Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="information-circle" size={24} color={COLORS.warning} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Información Importante</Text>
            <Text style={styles.infoText}>
              Todos los documentos deben estar vigentes. Si alguno vence, se desactivará tu cuenta como conductor.
            </Text>
          </View>
        </View>

        {/* Help Card */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.helpText}>
            Si tienes dudas sobre qué documentos subir o cómo hacerlo, comunícate con nuestro equipo de soporte.
          </Text>

          <TouchableOpacity
            style={styles.helpButton}
            activeOpacity={0.8}
            onPress={() => {
              Linking.openURL('mailto:soportetrive@gmail.com?subject=Consulta sobre Documentos&body=Hola, tengo una pregunta sobre mis documentos.')
            }}
          >
            <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
            <Text style={styles.helpButtonText}>Contactar Soporte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Restricted Access Screen
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  restrictedIcon: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  restrictedTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  restrictedText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primary + '20',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  roleBadgeText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  restrictedButtonContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  restrictedPrimaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  restrictedPrimaryBtnText: {
    color: COLORS.textInverse,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  restrictedSecondaryBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restrictedSecondaryBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h4,
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  progressCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  progressLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  progressValue: {
    ...TYPOGRAPHY.h3,
    fontSize: 28,
    color: '#fff',
    marginTop: SPACING.xs,
    fontWeight: '700',
  },
  progressPercentage: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 14,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  progressDescription: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  documentsSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    fontWeight: '700',
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  documentDescription: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  expiryDate: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  documentStatus: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
  },
  uploadBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnLoading: {
    opacity: 0.6,
  },
  renewBtn: {
    backgroundColor: COLORS.warning + '15',
  },
  rejectionBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.error + '10',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  rejectionContent: {
    flex: 1,
    gap: SPACING.xs,
  },
  rejectionTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '600',
  },
  rejectionReason: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
  },
  rejectionSubtext: {
    ...TYPOGRAPHY.label,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  verifyingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  verifyingText: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 12,
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning + '15',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  infoText: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  helpCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  helpTitle: {
    ...TYPOGRAPHY.h4,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  helpText: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  helpButtonText: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 14,
    color: COLORS.primary,
  },
  expiryInfoContainer: {
    marginTop: SPACING.sm,
    marginLeft: 0,
  },
  expiryBadge: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  expiryText: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 12,
    fontWeight: '600',
  },
  expiryNoDate: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
})
