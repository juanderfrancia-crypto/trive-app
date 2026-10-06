import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '../AppText'
import Icon, { type IconName } from '../Icon'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../theme/theme'

interface Props {
  visible: boolean
  onClose: () => void
  onCreateRoute: () => void
  onRecurringRoutes: () => void
}

export default function PublishSheet({ visible, onClose, onCreateRoute, onRecurringRoutes }: Props) {
  if (!visible) return null

  const pick = (action: () => void) => {
    onClose()
    setTimeout(action, 150)
  }

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.overlayTap} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Publicar viaje</Text>
        <Option
          icon="CirclePlus"
          title="Crear ruta"
          sub="Publica un viaje nuevo ahora"
          onPress={() => pick(onCreateRoute)}
        />
        <Option
          icon="Repeat"
          title="Rutas frecuentes"
          sub="Publica tus rutas guardadas en un toque"
          onPress={() => pick(onRecurringRoutes)}
        />
      </View>
    </View>
  )
}

function Option({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.itemIcon}>
        <Icon name={icon} size={20} color={COLORS.primary} />
      </View>
      <View style={styles.itemText}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSub}>{sub}</Text>
      </View>
      <Icon name="ChevronRight" size={18} color={COLORS.textTertiary} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,26,46,0.35)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  overlayTap: { flex: 1 },
  sheet: {
    ...SHADOWS.md,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  title: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: '800', marginBottom: SPACING.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1 },
  itemTitle: { ...TYPOGRAPHY.bodyMedium, color: COLORS.textPrimary, fontWeight: '700' },
  itemSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: SPACING.xs },
})
