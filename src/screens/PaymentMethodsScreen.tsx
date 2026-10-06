import { useEffect, useState } from 'react'
import { View, TouchableOpacity, StyleSheet, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon, { type IconName } from '../components/Icon'
import { useNavigation } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme/theme'
import { getPaymentPreference, setPaymentPreference, type PaymentPreference } from '../services/passengerPaymentPreference'
import { useAppStore } from '../store/useAppStore'
import { showSuccess, showError } from '../utils/showError'

const OPTIONS: { value: PaymentPreference; title: string; sub: string; icon: IconName }[] = [
  {
    value: 'cash',
    title: 'Efectivo',
    sub: 'Pagas en efectivo al conductor al llegar al destino.',
    icon: 'Banknote',
  },
  {
    value: 'transfer',
    title: 'Transferencia',
    sub: 'Pagas por Nequi, Daviplata o Bre-B con la llave que te muestra el conductor.',
    icon: 'Smartphone',
  },
]

export default function PaymentMethodsScreen() {
  const navigation = useNavigation()
  const userId = useAppStore((s) => s.user?.id)
  const [selected, setSelected] = useState<PaymentPreference>('cash')

  useEffect(() => {
    if (userId) getPaymentPreference(userId).then(setSelected)
  }, [userId])

  const choose = async (value: PaymentPreference) => {
    if (!userId || value === selected) return
    const previous = selected
    setSelected(value)
    try {
      await setPaymentPreference(userId, value)
      showSuccess('Preferencia guardada para tus próximas reservas')
    } catch {
      setSelected(previous)
      showError('No pudimos guardar tu preferencia. Intenta de nuevo.')
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Cómo pagas</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <View style={styles.notice}>
        <Icon name="Wallet" size={18} color={COLORS.primary} />
        <Text style={styles.noticeText}>
          El pago de tu viaje va directo al conductor. Trive no cobra ni retiene tu pago.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Preferencia para tus reservas</Text>

      <View style={styles.list}>
        {OPTIONS.map((option) => {
          const isSelected = selected === option.value
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => choose(option.value)}
              activeOpacity={0.85}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={[styles.optionIcon, isSelected && styles.optionIconSelected]}>
                <Icon name={option.icon} size={20} color={isSelected ? COLORS.white : COLORS.primary} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSub}>{option.sub}</Text>
              </View>
              <Icon
                name={isSelected ? 'CircleCheck' : 'Circle'}
                size={22}
                color={isSelected ? COLORS.primary : COLORS.textTertiary}
              />
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={styles.footnote}>
        Puedes cambiar tu forma de pago en cada reserva. Esta preferencia solo se usa para preseleccionarla.
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    ...SHADOWS.xs,
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnPlaceholder: { width: 40, height: 40 },
  title: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryTint,
  },
  noticeText: { ...TYPOGRAPHY.labelMedium, flex: 1, color: COLORS.primaryDark },

  sectionLabel: {
    ...TYPOGRAPHY.label,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.lg,
  },

  list: { marginHorizontal: SPACING.lg, gap: SPACING.md },
  option: {
    ...SHADOWS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
  },
  optionSelected: { borderColor: COLORS.primary },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: { backgroundColor: COLORS.primary },
  optionText: { flex: 1 },
  optionTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.textPrimary },
  optionSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },

  footnote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
})
