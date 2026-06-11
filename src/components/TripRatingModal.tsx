import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS } from '../theme/theme'

interface TripRatingModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (rating: number, comment?: string) => Promise<void>
  tripInfo?: {
    origin?: string
    destination?: string
    driverName?: string
  }
  isLoading?: boolean
}

export const TripRatingModal = ({
  visible,
  onClose,
  onSubmit,
  tripInfo,
  isLoading = false,
}: TripRatingModalProps) => {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      await onSubmit(rating, comment || undefined)
      setRating(5)
      setComment('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setRating(5)
    setComment('')
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Calificar viaje</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Trip Info */}
          {tripInfo && (
            <View style={styles.tripInfoSection}>
              <View>
                <Text style={styles.tripInfoLabel}>Recorrido</Text>
                <Text style={styles.tripInfoText}>
                  {tripInfo.origin} → {tripInfo.destination}
                </Text>
              </View>
              {tripInfo.driverName && (
                <View style={{ marginTop: SPACING.md }}>
                  <Text style={styles.tripInfoLabel}>Conductor</Text>
                  <Text style={styles.tripInfoText}>{tripInfo.driverName}</Text>
                </View>
              )}
            </View>
          )}

          {/* Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingQuestion}>¿Cómo fue tu experiencia?</Text>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => !submitting && setRating(star)}
                  activeOpacity={0.7}
                  disabled={submitting}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? '#FBBF24' : '#D1D5DB'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.ratingLabel}>
              {rating === 1 && '😞 Muy malo'}
              {rating === 2 && '😕 Malo'}
              {rating === 3 && '😐 Regular'}
              {rating === 4 && '🙂 Bueno'}
              {rating === 5 && '😃 Excelente'}
            </Text>
          </View>

          {/* Comment */}
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Comentario (opcional)</Text>
            <TextInput
              placeholder="Cuéntanos más sobre tu experiencia..."
              placeholderTextColor="#999"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              editable={!submitting}
              style={styles.commentInput}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={handleClose}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || isLoading}
              activeOpacity={0.7}
            >
              {submitting || isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Enviar calificación</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    maxHeight: '90%',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  tripInfoSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tripInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: SPACING.xs,
  },
  tripInfoText: {
    fontSize: 13,
    color: '#000',
  },
  ratingSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  ratingQuestion: {
    fontSize: 14,
    color: '#666',
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
  },
  commentSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  commentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: SPACING.sm,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: '#F9FAFB',
    fontSize: 13,
    color: '#000',
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  btn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
})
