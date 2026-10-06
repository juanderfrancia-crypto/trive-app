import { View, TouchableOpacity, StyleSheet, ScrollView, Image, Linking, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon, { type IconName } from '../components/Icon'
import { APP_VERSION_LABEL } from '../config/appInfo'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

const FEATURES = [
  'Precios transparentes: el pasajero paga directamente al conductor',
  'Conductores verificados con documentos revisados por el equipo Trive',
  'Calificación y reseñas después de cada viaje',
  'Chat integrado entre conductor y pasajero en cada trayecto',
  'Billetera para gestionar el saldo de publicaciones',
  'Programa de referidos para conductores',
]

const CONTACTS: { label: string; value: string; icon: IconName; color: string; url: string }[] = [
  { label: 'Correo', value: 'soportetrive@gmail.com', icon: 'Mail', color: COLORS.primary, url: 'mailto:soportetrive@gmail.com' },
  { label: 'WhatsApp', value: '+57 300 577 2967', icon: 'MessageCircle', color: COLORS.whatsapp, url: 'https://wa.me/573005772967' },
  { label: 'Llamada', value: '+57 317 302 8628', icon: 'Phone', color: COLORS.accent, url: 'tel:+573173028628' },
]

export default function AboutTriveScreen() {
  const navigation = useNavigation()

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Acerca de Trive</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.version}>Versión {APP_VERSION_LABEL}</Text>
        </View>

        <Card title="¿Qué es Trive?">
          <Text style={styles.body}>
            Trive es una plataforma colombiana de viajes compartidos que conecta conductores y pasajeros para hacer los desplazamientos más convenientes y económicos. No somos una empresa de transporte: somos tecnología que ayuda a compartir el costo de un trayecto que ya ibas a hacer.
          </Text>
        </Card>

        <Card title="¿Cómo funciona?">
          <Text style={styles.body}>
            El conductor publica su ruta con origen, destino, hora y precio por puesto. El pasajero la encuentra, reserva y acuerda el pago directamente con el conductor (efectivo, Nequi, Daviplata o Bre-B). Por cada publicación, Trive cobra al conductor $2.000 como tarifa de intermediación.
          </Text>
        </Card>

        <Card title="¿Por qué Trive?">
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.feature}>
              <Icon name="CircleCheck" size={18} color={COLORS.primary} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>Contáctanos</Text>
        <View style={styles.group}>
          {CONTACTS.map((contact, index) => (
            <View key={contact.label}>
              {index > 0 && <View style={styles.divider} />}
              <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(contact.url)} activeOpacity={0.75}>
                <View style={[styles.contactIcon, { backgroundColor: contact.color + '18' }]}>
                  <Icon name={contact.icon} size={18} color={contact.color} />
                </View>
                <View style={styles.contactText}>
                  <Text style={styles.contactLabel}>{contact.label}</Text>
                  <Text style={styles.contactValue}>{contact.value}</Text>
                </View>
                <Icon name="ChevronRight" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>© 2026 Trive. Todos los derechos reservados.</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

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

  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },

  hero: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryTint,
    gap: SPACING.sm,
  },
  logo: { width: 220, height: 100 },
  version: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },

  card: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  cardTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.primary, marginBottom: SPACING.xs },
  body: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, lineHeight: 22 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginTop: SPACING.xs },
  featureText: { ...TYPOGRAPHY.bodySmall, flex: 1, color: COLORS.textSecondary, lineHeight: 20 },

  sectionTitle: {
    ...TYPOGRAPHY.label,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: SPACING.md,
  },
  group: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg },
  contactIcon: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  contactText: { flex: 1 },
  contactLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  contactValue: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING.lg },

  footer: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, textAlign: 'center', marginTop: SPACING.md },
})
