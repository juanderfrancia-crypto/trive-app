import { View, TouchableOpacity, StyleSheet, ScrollView, Linking, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon, { type IconName } from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

const CONTACTS: { label: string; value: string; time: string; icon: IconName; color: string; onPress: () => void }[] = [
  {
    label: 'Correo electrónico',
    value: 'soportetrive@gmail.com',
    time: 'Respuesta en 24 horas',
    icon: 'Mail',
    color: COLORS.primary,
    onPress: () => Linking.openURL('mailto:soportetrive@gmail.com'),
  },
  {
    label: 'WhatsApp',
    value: '+57 (300) 577-2967',
    time: 'Lunes a viernes, 8 a. m. a 6 p. m.',
    icon: 'MessageCircle',
    color: COLORS.whatsapp,
    onPress: () => Linking.openURL('https://wa.me/573005772967'),
  },
  {
    label: 'Llamada',
    value: '+57 (317) 302-8628',
    time: 'Lunes a viernes, 8 a. m. a 6 p. m.',
    icon: 'Phone',
    color: COLORS.accent,
    onPress: () => Linking.openURL('tel:+573173028628'),
  },
]

export default function SupportScreen() {
  const navigation = useNavigation()

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Soporte</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Illustration name="postOnline" width={160} />
          <Text style={styles.heroTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.heroText}>Nuestro equipo te responde por el canal que prefieras.</Text>
        </View>

        <Text style={styles.sectionTitle}>Contacto</Text>
        {CONTACTS.map((contact) => (
          <TouchableOpacity key={contact.label} style={styles.card} onPress={contact.onPress} activeOpacity={0.8}>
            <View style={[styles.cardIcon, { backgroundColor: contact.color + '18' }]}>
              <Icon name={contact.icon} size={20} color={contact.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{contact.label}</Text>
              <Text style={styles.cardSub}>{contact.value}</Text>
              <Text style={styles.cardMeta}>{contact.time}</Text>
            </View>
            <Icon name="ChevronRight" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Recursos</Text>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Help' as never)} activeOpacity={0.8}>
          <View style={styles.cardIcon}>
            <Icon name="CircleHelp" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Preguntas frecuentes</Text>
            <Text style={styles.cardSub}>Respuestas rápidas a lo más común</Text>
          </View>
          <Icon name="ChevronRight" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('LearningCenter' as never)} activeOpacity={0.8}>
          <View style={styles.cardIcon}>
            <Icon name="BookOpen" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Centro de aprendizaje</Text>
            <Text style={styles.cardSub}>Tutoriales y guías paso a paso</Text>
          </View>
          <Icon name="ChevronRight" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('BugReport' as never)} activeOpacity={0.8}>
          <View style={[styles.cardIcon, { backgroundColor: COLORS.errorLight }]}>
            <Icon name="Bug" size={20} color={COLORS.error} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Reportar un problema</Text>
            <Text style={styles.cardSub}>Cuéntanos sobre errores o fallas</Text>
          </View>
          <Icon name="ChevronRight" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Icon name="Info" size={16} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Para tu cuenta, la verificación de documentos o un incidente durante un trayecto, escríbenos directamente. Los pagos entre conductor y pasajero son directos: Trive no los gestiona.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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

  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },

  hero: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryTint,
    marginBottom: SPACING.lg,
  },
  heroTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold, marginTop: SPACING.md },
  heroText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },

  sectionTitle: {
    ...TYPOGRAPHY.label,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  card: {
    ...SHADOWS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  cardSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  cardMeta: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, marginTop: 2 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryTint,
  },
  infoText: { ...TYPOGRAPHY.caption, flex: 1, color: COLORS.primaryDark, lineHeight: 18 },
})
