import React, { useState } from 'react'
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import Toast from './Toast'

interface RatingModalProps {
  visible: boolean
  userName: string
  onClose: () => void
  onSubmit: (rating: number, comment: string, recommend: boolean) => Promise<void>
  isDriver?: boolean
  initialRating?: number
  initialComment?: string
  initialRecommend?: boolean
}

export default function RatingModal({
  visible,
  userName,
  onClose,
  onSubmit,
  isDriver = false,
  initialRating = 0,
  initialComment = '',
  initialRecommend = false,
}: RatingModalProps) {
  const [rating, setRating] = useState(initialRating)
  const [comment, setComment] = useState(initialComment)
  const [recommend, setRecommend] = useState(initialRecommend)
  const [loading, setLoading] = useState(false)
  const [toastConfig, setToastConfig] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  })

  const handleSubmit = async () => {
    if (rating === 0) {
      setToastConfig({
        visible: true,
        message: 'Por favor selecciona una calificación',
        type: 'error',
      })
      return
    }

    try {
      setLoading(true)
      await onSubmit(rating, comment, recommend)
      
      setToastConfig({
        visible: true,
        message: '✓ Calificación enviada',
        type: 'success',
      })
      
      // Reiniciar formulario
      setRating(0)
      setComment('')
      setRecommend(false)
      
      // Cerrar modal después de 1 segundo
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error: any) {
      setToastConfig({
        visible: true,
        message: error.message || 'Error al enviar calificación',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Calificar {isDriver ? 'conductor' : 'pasajero'}</Text>
              <TouchableOpacity
                onPress={onClose}
                disabled={loading}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* User Name */}
            <View style={styles.userSection}>
              <View style={styles.userInitial}>
                <Text style={styles.userInitialText}>{(userName || 'U').charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.userName}>{userName}</Text>
            </View>

            {/* Rating Stars */}
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>¿Cómo fue tu experiencia?</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={44}
                      color={star <= rating ? COLORS.accent : '#ddd'}
                      style={styles.star}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && (
                <Text style={styles.ratingText}>
                  {rating === 1 && 'Muy mala'}
                  {rating === 2 && 'Mala'}
                  {rating === 3 && 'Normal'}
                  {rating === 4 && 'Buena'}
                  {rating === 5 && '¡Excelente!'}
                </Text>
              )}
            </View>

            {/* Comment Input */}
            <View style={styles.commentSection}>
              <Text style={styles.commentLabel}>Agregar comentario (opcional)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Comparte tu experiencia..."
                placeholderTextColor="#999"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>

            {/* Recommendation Toggle */}
            <View style={styles.recommendSection}>
              <Text style={styles.recommendLabel}>¿Lo recomendarías?</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    !recommend && styles.toggleButtonActiveNo,
                  ]}
                  onPress={() => setRecommend(false)}
                  disabled={loading}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={!recommend ? 'white' : '#999'}
                  />
                  <Text
                    style={[
                      styles.toggleButtonText,
                      !recommend && styles.toggleButtonTextActive,
                    ]}
                  >
                    No
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    recommend && styles.toggleButtonActiveYes,
                  ]}
                  onPress={() => setRecommend(true)}
                  disabled={loading}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={recommend ? 'white' : '#999'}
                  />
                  <Text
                    style={[
                      styles.toggleButtonText,
                      recommend && styles.toggleButtonTextActive,
                    ]}
                  >
                    Sí
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading || rating === 0}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Enviar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        onHide={() => setToastConfig((prev) => ({ ...prev, visible: false }))}
      />
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '90%',
    maxWidth: 400,
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    fontSize: 18,
  },
  userSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  userInitial: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  userInitialText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  ratingLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  star: {
    marginHorizontal: SPACING.xs,
  },
  ratingText: {
    ...TYPOGRAPHY.label,
    color: COLORS.accent,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  commentSection: {
    marginBottom: SPACING.lg,
  },
  commentLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    minHeight: 80,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  recommendSection: {
    marginBottom: SPACING.lg,
  },
  recommendLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  toggleButtonActive: {
    borderWidth: 0,
  },
  toggleButtonActiveNo: {
    backgroundColor: '#ef4444',
    borderWidth: 0,
  },
  toggleButtonActiveYes: {
    backgroundColor: '#10b981',
    borderWidth: 0,
  },
  toggleButtonText: {
    ...TYPOGRAPHY.body,
    color: '#999',
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    ...TYPOGRAPHY.body,
    color: 'white',
    fontWeight: '600',
  },
})
