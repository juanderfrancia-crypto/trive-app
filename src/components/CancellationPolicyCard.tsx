import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Icon from './Icon'
import { Text } from './AppText'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../theme/theme'

// Aviso corto de cancelación. No muestra montos ni porcentajes: la política con
// montos está pendiente de revisión legal.
export default function CancellationPolicyCard() {
  const navigation = useNavigation<any>()

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon name="Info" size={18} color={COLORS.primary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.text}>
          Puedes cancelar tu reserva antes de la salida. Las cancelaciones tardías pueden tener un costo.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Help')}
          activeOpacity={0.7}
          accessibilityRole="link"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.link}>Ver política</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  text: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  link: {
    ...TYPOGRAPHY.labelMedium,
    marginTop: SPACING.xs,
    color: COLORS.primary,
    fontWeight: '600',
  },
})
