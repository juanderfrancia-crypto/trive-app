import { useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../theme/theme'
import Icon from '../components/Icon'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import { useAppStore } from '../store/useAppStore'
import { useAirportNegotiation } from '../hooks/useAirportNegotiation'
import { showSuccess, showError } from '../utils/showError'

interface RouteParams {
  requestId: string
  mode: 'propose' | 'update'
  currentPrice: number
}

// Pantalla normal en vez de modal: un <Modal> nativo de RN no se redimensiona
// bien con el teclado en Android (mismo problema ya resuelto así en Datos
// personales, Agregar método y el chat de negociación).
export default function SetTripPriceScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { requestId, mode, currentPrice } = (route.params ?? {}) as RouteParams
  const user = useAppStore((s) => s.user)
  const { createOffer, updateRequestPrice } = useAirportNegotiation()

  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)

  const isPropose = mode === 'propose'

  const handleSubmit = async () => {
    const value = parseInt(price.replace(/\D/g, ''), 10)
    if (!value || value <= 0) {
      showError('Ingresa un precio válido')
      return
    }
    try {
      setSaving(true)
      if (isPropose) {
        if (!user?.id) return
        await createOffer(requestId, user.id, value)
        showSuccess('Tu propuesta fue enviada. El pasajero la verá al instante.')
      } else {
        await updateRequestPrice(requestId, value)
        showSuccess('Precio actualizado. Los conductores verán el cambio al instante.')
      }
      navigation.goBack()
    } catch (err: any) {
      showError(err.message || 'No se pudo guardar el precio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>{isPropose ? 'Proponer precio' : 'Subir oferta'}</Text>
      </View>

      <KeyboardAvoidingScreen measureKeyboard style={s.body}>
        <Text style={s.label}>
          {isPropose ? 'Precio del pasajero' : 'Precio actual'}: ${currentPrice.toLocaleString('es-CO')}
        </Text>
        <View style={s.inputRow}>
          <Text style={s.currency}>$</Text>
          <TextInput
            style={s.input}
            value={price}
            onChangeText={(t) => setPrice(t.replace(/\D/g, ''))}
            keyboardType="numeric"
            placeholder="Tu precio"
            placeholderTextColor={COLORS.textTertiary}
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[s.submitBtn, saving && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={s.submitBtnText}>{isPropose ? 'Enviar propuesta' : 'Actualizar precio'}</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingScreen>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { ...TYPOGRAPHY.h4, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  body: { flex: 1, padding: SPACING.lg },
  label: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.md },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  currency: { ...TYPOGRAPHY.h3, color: COLORS.textSecondary, marginRight: SPACING.sm },
  input: { flex: 1, ...TYPOGRAPHY.h3, color: COLORS.textPrimary, paddingVertical: SPACING.md },
  submitBtn: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { ...TYPOGRAPHY.bodySmall, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.white },
})
