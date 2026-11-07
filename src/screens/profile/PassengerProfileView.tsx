import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { Text } from '../../components/AppText'
import Icon from '../../components/Icon'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../theme/theme'
import { APP_VERSION_LABEL } from '../../config/appInfo'
import type { Profile } from '../../hooks/useProfile'

type ProfileExtras = {
  emergency_contact?: { name: string; phone: string } | null
}

interface PassengerProfileViewProps {
  userName?: string
  profile: Profile | null
  totalTrips: number
  pendingConfirmationCount: number
  avatarUri?: string
  avatarBroken: boolean
  initials: string
  uploadingPhoto: boolean
  onChangeAvatar: () => void
  onAvatarError: () => void
  onOpenEmergencyContact: () => void
  onBecomeDriver: () => void
  onOpenUpcomingTrips: () => void
  onOpenHistory: () => void
  onOpenRequests: () => void
  onOpenPaymentMethods: () => void
  onEditName: () => void
  onOpenPrivacy: () => void
  onOpenHelp: () => void
  onOpenSettings: () => void
}

// Fila de menú con título, subtítulo y chevron.
function MenuRow({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSub}>{sub}</Text>
      </View>
      <Icon name="ChevronRight" size={20} color={COLORS.textTertiary} />
    </TouchableOpacity>
  )
}

export default function PassengerProfileView(p: PassengerProfileViewProps) {
  const extras = p.profile as ProfileExtras | null
  const emergencyContact = extras?.emergency_contact ?? null

  return (
    <>
      <Text style={styles.title}>Mi perfil</Text>

      <View style={styles.profileRow}>
        <View style={styles.avatarWrap}>
          <TouchableOpacity style={styles.avatar} onPress={p.onChangeAvatar} disabled={p.uploadingPhoto} activeOpacity={0.85} accessibilityLabel="Cambiar foto de perfil">
            {p.uploadingPhoto
              ? <ActivityIndicator color={COLORS.primary} />
              : p.avatarUri && !p.avatarBroken
                ? <Image source={{ uri: p.avatarUri }} style={styles.avatarImg} onError={p.onAvatarError} />
                : <Text style={styles.avatarInitials}>{p.initials}</Text>}
          </TouchableOpacity>
          <View style={styles.avatarBadge}>
            <Icon name="Camera" size={12} color={COLORS.white} />
          </View>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name} numberOfLines={1}>{p.userName || 'Usuario'}</Text>
          <Text style={styles.meta}>
            Pasajero · ★ {(p.profile?.rating ?? 0).toFixed(1)} · {p.totalTrips} {p.totalTrips === 1 ? 'viaje' : 'viajes'}
          </Text>
          <TouchableOpacity onPress={p.onChangeAvatar} disabled={p.uploadingPhoto} activeOpacity={0.7} style={styles.linkRow}>
            <Icon name="ImagePlus" size={14} color={COLORS.primary} />
            <Text style={styles.linkText}>Cambiar foto de perfil</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.card} onPress={p.onOpenEmergencyContact} activeOpacity={0.75}>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Contacto de emergencia</Text>
          <Text style={styles.cardSub}>Recibe tu ubicación en un viaje</Text>
        </View>
        {emergencyContact
          ? <View style={styles.pillOk}><Text style={styles.pillOkText}>Configurado</Text></View>
          : <View style={styles.pillWarn}><Text style={styles.pillWarnText}>Sin configurar</Text></View>}
      </TouchableOpacity>

      {/* Entrada para ser conductor: se conserva porque es la única forma de cambiar de modo. */}
      <View style={styles.section}>
        <TouchableOpacity onPress={p.onBecomeDriver} activeOpacity={0.88}>
          <View style={[styles.ctaCard, { borderRadius: RADIUS.xl, backgroundColor: COLORS.primary }]}>
            <Image
              source={require('../../../assets/proud-driver.png')}
              contentFit="cover"
              style={styles.ctaBgImage}
            />
            <View style={styles.ctaOportunidad}>
              <Text style={styles.ctaOportunidadText}>OPORTUNIDAD</Text>
            </View>
            <Text style={styles.ctaTitle}>Gana dinero con{'\n'}Trive</Text>
            <Text style={styles.ctaSub}>Convierte tu tiempo libre en ingresos extra manejando con nosotros.</Text>
            <View style={styles.ctaBtn}>
              <Text style={styles.ctaBtnText}>Cambiar a modo Conductor</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Mis viajes</Text>
      <View style={styles.group}>
        <MenuRow
          title="Próximos y pendientes"
          sub={p.pendingConfirmationCount > 0 ? `${p.pendingConfirmationCount} por confirmar` : 'Sin viajes por confirmar'}
          onPress={p.onOpenUpcomingTrips}
        />
        <View style={styles.rowDivider} />
        <MenuRow title="Historial" sub="Viajes completados y calificaciones" onPress={p.onOpenHistory} />
        <View style={styles.rowDivider} />
        <MenuRow title="Solicitudes de aeropuerto" sub="Ofertas y chats con conductores" onPress={p.onOpenRequests} />
      </View>

      <Text style={styles.sectionLabel}>Cuenta</Text>
      <View style={styles.group}>
        <MenuRow title="Cómo pagas" sub="Efectivo o transferencia a tu conductor" onPress={p.onOpenPaymentMethods} />
        <View style={styles.rowDivider} />
        <MenuRow title="Datos personales" sub="Nombre, correo y teléfono" onPress={p.onEditName} />
        <View style={styles.rowDivider} />
        <MenuRow title="Privacidad y eliminar cuenta" sub="Tus datos y tu cuenta" onPress={p.onOpenPrivacy} />
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.group} onPress={p.onOpenHelp} activeOpacity={0.75}>
          <View style={styles.helpRow}>
            <View style={styles.helpIcon}><Icon name="Headset" size={20} color={COLORS.primary} /></View>
            <View style={styles.helpText}>
              <Text style={styles.payName}>Centro de Ayuda</Text>
              <Text style={styles.paySub}>Soporte 24/7 disponible</Text>
            </View>
            <Icon name="ChevronRight" size={16} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.group} onPress={p.onOpenSettings} activeOpacity={0.75}>
          <View style={styles.helpRow}>
            <View style={styles.settingsIcon}><Icon name="Settings" size={20} color={COLORS.primary} /></View>
            <View style={styles.helpText}>
              <Text style={styles.payName}>Configuración</Text>
              <Text style={styles.paySub}>Ajustes y preferencias</Text>
            </View>
            <Icon name="ChevronRight" size={16} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Trive · versión {APP_VERSION_LABEL}</Text>
      <View style={{ height: SPACING.xxxl }} />
    </>
  )
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },

  title: { ...TYPOGRAPHY.h2, color: COLORS.textPrimary, marginTop: SPACING.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, marginTop: SPACING.lg },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.primaryTint,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 68, height: 68 },
  avatarInitials: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  avatarBadge: {
    position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.textPrimary, borderWidth: 2, borderColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  name: { fontSize: 19, fontWeight: '800', color: COLORS.textPrimary },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  linkText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  card: {
    ...SHADOWS.sm,
    marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md,
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  cardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  pillOk: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full, backgroundColor: COLORS.successLight },
  pillOkText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  pillWarn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full, backgroundColor: COLORS.warningLight },
  pillWarnText: { fontSize: 12, fontWeight: '700', color: COLORS.warningDark },

  sectionLabel: {
    marginTop: SPACING.xl, fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  group: { ...SHADOWS.sm, marginTop: SPACING.sm + 2, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  menuSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING.lg },

  ctaCard: { borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACING.xl, paddingBottom: SPACING.xxl },
  ctaBgImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.26 },
  ctaOportunidad: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md, paddingVertical: 4,
    borderRadius: RADIUS.full, marginBottom: SPACING.md,
  },
  ctaOportunidadText: { fontSize: 11, fontWeight: '700', color: COLORS.white, letterSpacing: 0.5 },
  ctaTitle: { fontSize: 24, fontWeight: '800', color: COLORS.white, lineHeight: 30, letterSpacing: -0.5, marginBottom: SPACING.sm },
  ctaSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18, marginBottom: SPACING.xl },
  ctaBtn: { alignSelf: 'stretch', backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  ctaBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primaryDark },
  helpRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  helpIcon: {
    width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryTint, justifyContent: 'center', alignItems: 'center',
  },
  settingsIcon: {
    width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryTint, justifyContent: 'center', alignItems: 'center',
  },
  helpText: { flex: 1 },
  payName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  paySub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  footer: {
    textAlign: 'center', fontSize: 11, fontWeight: '600',
    color: COLORS.textTertiary, letterSpacing: 0.5,
    marginTop: SPACING.xl, marginBottom: SPACING.md,
  },
})
