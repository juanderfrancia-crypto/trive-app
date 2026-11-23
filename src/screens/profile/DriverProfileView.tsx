import React from 'react'
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import { Text } from '../../components/AppText'
import Icon, { type IconName } from '../../components/Icon'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../../theme/theme'
import { getExpiryStatus, DOCUMENT_LABELS } from '../../utils/documentHelpers'
import Illustration from '../../components/illustrations/Illustration'
import { APP_VERSION_LABEL } from '../../config/appInfo'

const REQUIRED_DOCS = ['cedula', 'licencia', 'tarjeta_propiedad', 'soat', 'tecnomecanica']

type DocState = {
  label: string
  color: string
  icon: IconName
  iconColor: string
  approved: boolean
  expiryText?: string
  expiryColor?: string
}

function docState(doc: any): DocState {
  if (!doc) return { label: 'Sin subir', color: COLORS.textTertiary, icon: 'CircleDashed', iconColor: COLORS.textTertiary, approved: false }
  const expiry = getExpiryStatus(doc.expiry_date)
  if (doc.status === 'expired' || expiry?.isExpired) {
    return {
      label: 'Vencido', color: COLORS.error, icon: 'TriangleAlert', iconColor: COLORS.error, approved: false,
      expiryText: 'Sube el documento renovado', expiryColor: COLORS.error,
    }
  }
  if (doc.status === 'rejected') return { label: 'Rechazado · vuelve a subir', color: COLORS.error, icon: 'CircleX', iconColor: COLORS.error, approved: false }
  if (doc.status === 'verified') {
    const expiryColor = !expiry ? COLORS.textSecondary : expiry.daysLeft < 15 ? COLORS.error : expiry.daysLeft < 30 ? COLORS.warning : COLORS.textSecondary
    return {
      label: 'Aprobado', color: COLORS.textPrimary, icon: 'CircleCheck', iconColor: COLORS.textPrimary, approved: true,
      expiryText: expiry?.label, expiryColor,
    }
  }
  return { label: 'En revisión', color: COLORS.warning, icon: 'Clock', iconColor: COLORS.warning, approved: false }
}

const VEHICLE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  verified: { label: 'Aprobado', color: COLORS.textPrimary, bg: COLORS.surfaceAlt },
  pending: { label: 'En revisión', color: COLORS.warning, bg: COLORS.warningLight },
  rejected: { label: 'Rechazado', color: COLORS.error, bg: COLORS.errorLight },
}

export type DriverProfileViewProps = {
  user: any
  profile: any
  driverVehicle: any
  driverDocs: Record<string, any>
  recentRoutes: any[]
  monthEarnings: number
  totalTrips: number
  rating: string
  avatarUri?: string | null
  initials: string
  displayEmail: string | null | undefined
  uploadingPhoto: boolean
  uploadingVehiclePhoto: boolean
  vehiclePhotoUrl: string | null
  onChangeAvatar: () => void
  onEditName: () => void
  onChangeVehiclePhoto: () => void
  onVehiclePhotoError: () => void
  onOpenWallet: () => void
  onOpenEarnings: () => void
  onOpenPanel: () => void
  onOpenTrips: () => void
  onOpenPaymentMethods: () => void
  onOpenReferral: () => void
  onOpenSettings: () => void
  onOpenHelp: () => void
  onOpenDocuments: () => void
  onEditVehicle: () => void
  onLogout: () => void
}

export default function DriverProfileView(p: DriverProfileViewProps) {
  const docs = REQUIRED_DOCS.map((type) => ({ type, ...docState(p.driverDocs[type]) }))
  const approvedCount = docs.filter((d) => d.approved).length
  const vehicleStatus = VEHICLE_STATUS[p.driverVehicle?.vehicle_status ?? ''] ?? null
  const vehicleName = p.driverVehicle
    ? [p.driverVehicle.vehicle_make, p.driverVehicle.vehicle_model].filter(Boolean).join(' ') || 'Vehículo'
    : 'Sin vehículo registrado'

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Tu perfil</Text>
        <View style={styles.modePill}>
          <Text style={styles.modeText}>Modo conductor</Text>
        </View>
      </View>

      <View style={styles.identity}>
        <TouchableOpacity onPress={p.onChangeAvatar} disabled={p.uploadingPhoto} activeOpacity={0.85} accessibilityLabel="Cambiar foto de perfil">
          <View style={styles.avatarWrap}>
            {p.uploadingPhoto ? (
              <View style={[styles.avatar, styles.avatarBusy]}><ActivityIndicator color={COLORS.white} /></View>
            ) : p.avatarUri ? (
              <Image source={{ uri: p.avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarText}>{p.initials}</Text></View>
            )}
            <View style={styles.avatarBadge}>
              <Icon name="Camera" size={12} color={COLORS.white} />
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.identityText}>
          <TouchableOpacity onPress={p.onEditName} activeOpacity={0.7} style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{p.user?.name || 'Conductor'}</Text>
            <Icon name="Pencil" size={13} color={COLORS.textTertiary} />
          </TouchableOpacity>
          {!!p.user?.phone && <Text style={styles.phone} numberOfLines={1}>+{p.user.phone}</Text>}
          <Text style={styles.identitySub}>★ {p.rating} · {p.totalTrips} rutas</Text>
          {!!p.displayEmail && <Text style={styles.email} numberOfLines={1}>{p.displayEmail}</Text>}
          <TouchableOpacity onPress={p.onChangeAvatar} disabled={p.uploadingPhoto} activeOpacity={0.7} style={styles.linkRow}>
            <Icon name="ImagePlus" size={14} color={COLORS.primary} />
            <Text style={styles.linkText}>Cambiar foto de perfil</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.walletCard}>
        <View style={styles.walletText}>
          <Text style={styles.walletLabel}>Saldo de tu billetera</Text>
          <Text style={styles.walletValue}>${(p.user?.balance ?? 0).toLocaleString('es-CO')}</Text>
          <Text style={styles.walletHint}>Cada ruta que publicas cuesta entre $2.500 y $20.000, según su valor.</Text>
          <TouchableOpacity style={styles.walletBtn} onPress={p.onOpenWallet} activeOpacity={0.85}>
            <Text style={styles.walletBtnText}>Ver billetera</Text>
          </TouchableOpacity>
        </View>
        <Illustration name="savingMoney" width={110} />
      </View>

      <Text style={[styles.section, styles.sectionFullBleed]}>Verificación</Text>
      <View style={[styles.card, styles.sectionFullBleed]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Documentos</Text>
          <Text style={styles.cardMeta}>{approvedCount} de {REQUIRED_DOCS.length} aprobados</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(approvedCount / REQUIRED_DOCS.length) * 100}%` }]} />
        </View>
        {docs.map((d, idx) => (
          <View key={d.type} style={[styles.docRow, idx === 0 && styles.docRowFirst]}>
            <Text style={styles.docName}>{DOCUMENT_LABELS[d.type] ?? d.type}</Text>
            <View style={styles.docStatus}>
              <View style={styles.docStatusRow}>
                <Icon name={d.icon} size={16} color={d.iconColor} />
                <Text style={[styles.docStatusText, { color: d.color }]}>{d.label}</Text>
              </View>
              {!!d.expiryText && <Text style={[styles.docExpiry, { color: d.expiryColor }]}>{d.expiryText}</Text>}
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.rowAction} onPress={p.onOpenDocuments} activeOpacity={0.7}>
          <Text style={styles.rowActionText}>{approvedCount < REQUIRED_DOCS.length ? 'Subir o actualizar documentos' : 'Ver documentos'}</Text>
          <Icon name="ChevronRight" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Mi vehículo</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.vehiclePhotoWrap}
          onPress={p.onChangeVehiclePhoto}
          disabled={p.uploadingVehiclePhoto}
          activeOpacity={0.85}
          accessibilityLabel="Cambiar foto del vehículo"
        >
          {p.uploadingVehiclePhoto ? (
            <View style={[styles.vehiclePhoto, styles.vehiclePhotoEmpty]}><ActivityIndicator color={COLORS.primary} /></View>
          ) : p.vehiclePhotoUrl ? (
            <Image source={{ uri: p.vehiclePhotoUrl }} style={styles.vehiclePhoto} onError={p.onVehiclePhotoError} />
          ) : (
            <View style={[styles.vehiclePhoto, styles.vehiclePhotoEmpty]}>
              <Icon name="Camera" size={26} color={COLORS.primary} />
              <Text style={styles.vehiclePhotoEmptyText}>Subir foto del vehículo</Text>
            </View>
          )}
          <View style={styles.vehiclePhotoBadge}>
            <Icon name="Camera" size={13} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        <View style={styles.vehicleRow}>
          <View style={styles.vehicleText}>
            <Text style={styles.cardTitle} numberOfLines={1}>{vehicleName}</Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {[p.driverVehicle?.vehicle_plate, p.driverVehicle?.vehicle_color].filter(Boolean).join(' · ') || 'Sin datos'}
            </Text>
          </View>
          {vehicleStatus && (
            <View style={[styles.statusPill, { backgroundColor: vehicleStatus.bg }]}>
              <Text style={[styles.statusPillText, { color: vehicleStatus.color }]}>{vehicleStatus.label}</Text>
            </View>
          )}
        </View>
        {!!p.driverVehicle && (
          <TouchableOpacity style={styles.rowAction} onPress={p.onEditVehicle} activeOpacity={0.7}>
            <Text style={styles.rowActionText}>Editar vehículo</Text>
            <Icon name="ChevronRight" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.section, styles.sectionFullBleed]}>Mi trabajo</Text>
      <View style={styles.list}>
        <ListRow icon="TrendingUp" title="Ganancias del mes" value={`$${p.monthEarnings.toLocaleString('es-CO')}`} onPress={p.onOpenEarnings} />
        <ListRow icon="Route" title="Mis rutas" subtitle="Rutas programadas, en curso y completadas" value={`${p.recentRoutes.length}`} onPress={p.onOpenTrips} />
        <ListRow icon="LayoutDashboard" title="Mi panel" subtitle="Reservas, pasajeros y estado de tus rutas" onPress={p.onOpenPanel} />
      </View>

      <Text style={[styles.section, styles.sectionFullBleed]}>Cuenta</Text>
      <View style={styles.list}>
        <ListRow icon="Smartphone" title="Métodos de pago" subtitle="Nequi, Daviplata y llave Bre-B" onPress={p.onOpenPaymentMethods} />
        <ListRow icon="Gift" title="Referidos" subtitle="Gana $2.500 por cada conductor que traigas" onPress={p.onOpenReferral} />
        <ListRow icon="Settings" title="Configuración" subtitle="Preferencias y privacidad" onPress={p.onOpenSettings} />
        <ListRow icon="LifeBuoy" title="Centro de ayuda" onPress={p.onOpenHelp} />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={p.onLogout} activeOpacity={0.75}>
        <View style={styles.logoutIconWrap}>
          <Icon name="LogOut" size={18} color="#fff" />
        </View>
        <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Trive · versión {APP_VERSION_LABEL}</Text>
    </ScrollView>
  )
}

function ListRow({ icon, title, subtitle, value, danger, onPress }: {
  icon: IconName; title: string; subtitle?: string; value?: string; danger?: boolean; onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.listRow} onPress={onPress} activeOpacity={0.7}>
      <Icon name={icon} size={20} color={danger ? COLORS.error : COLORS.primary} />
      <View style={styles.listText}>
        <Text style={[styles.listTitle, danger && { color: COLORS.error }]}>{title}</Text>
        {!!subtitle && <Text style={styles.listSub}>{subtitle}</Text>}
      </View>
      {!!value && <Text style={styles.listValue}>{value}</Text>}
      <Icon name="ChevronRight" size={16} color={COLORS.textTertiary} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
  modePill: { backgroundColor: COLORS.primaryTint, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full },
  modeText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  identity: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, marginTop: SPACING.xl },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarBusy: { backgroundColor: COLORS.primaryLight },
  avatarText: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  avatarBadge: {
    position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.textPrimary, borderWidth: 2, borderColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  identityText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, flexShrink: 1 },
  phone: { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
  identitySub: { ...TYPOGRAPHY.body2, color: COLORS.textSecondary, marginTop: 2 },
  email: { fontSize: 13, color: COLORS.textTertiary, marginTop: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  linkText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  walletCard: { ...SHADOWS.md, shadowColor: COLORS.primary, shadowOpacity: 0.28, marginTop: SPACING.xl, borderRadius: RADIUS.xl, padding: SPACING.xl, backgroundColor: COLORS.primaryTint, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  walletText: { flex: 1 },
  walletLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.6, textTransform: 'uppercase' },
  walletValue: { fontSize: 32, fontWeight: '800', color: COLORS.textPrimary, marginTop: SPACING.xs, letterSpacing: -0.5 },
  walletHint: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.xs, lineHeight: 19 },
  walletBtn: { ...SHADOWS.xs, shadowColor: COLORS.primary, shadowOpacity: 0.3, marginTop: SPACING.lg, height: 46, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  walletBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },

  section: { ...TYPOGRAPHY.bold, fontSize: 13, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: SPACING.xl, marginBottom: SPACING.sm },
  // "Mi trabajo"/"Cuenta": la lista de abajo debe quedar al ras del borde de
  // la pantalla (como en PassengerProfileView), no encerrada por el padding
  // de `content` -- por eso tanto el rótulo como la lista cancelan ese padding
  // con margen negativo, igual que el resto del contenido del pasajero.
  sectionFullBleed: { marginHorizontal: -SPACING.lg },

  // Borde en vez de sombra (mismo motivo que en PassengerProfileView.tsx).
  card: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 2 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.surfaceAlt, marginTop: SPACING.md, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.borderLight, marginTop: SPACING.sm },
  docRowFirst: { marginTop: SPACING.md },
  docName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  docStatus: { alignItems: 'flex-end', flexShrink: 1, marginLeft: SPACING.sm },
  docStatusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  docStatusText: { fontSize: 13, fontWeight: '700' },
  docExpiry: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  vehiclePhotoWrap: {
    width: '100%', height: 140, borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryTint,
    overflow: 'hidden', marginBottom: SPACING.md,
  },
  vehiclePhoto: { width: '100%', height: '100%' },
  vehiclePhotoEmpty: { alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
  vehiclePhotoEmptyText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  vehiclePhotoBadge: {
    position: 'absolute', right: SPACING.sm, bottom: SPACING.sm, width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.textPrimary, borderWidth: 2, borderColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  vehicleText: { flex: 1 },
  statusPill: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  statusPillText: { fontSize: 13, fontWeight: '700' },
  rowAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: SPACING.xs, marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  rowActionText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  list: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, overflow: 'hidden', marginHorizontal: -SPACING.lg },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md + 2, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  listText: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  listSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  listValue: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  footer: { textAlign: 'center', fontSize: 11, color: COLORS.textTertiary, marginTop: SPACING.xl },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.full,
    paddingVertical: 10,
    paddingHorizontal: 28,
    marginTop: SPACING.xl,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  logoutIconWrap: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
})
