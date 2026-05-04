import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

interface FAQItem {
  id: string
  category: string
  question: string
  answer: string
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    category: 'General',
    question: '¿Qué es Trive?',
    answer:
      'Trive es una plataforma de viajes compartidos que conecta conductores y pasajeros. Permite compartir viajes de forma segura, asequible y sustentable.',
  },
  {
    id: '2',
    category: 'Pasajeros',
    question: '¿Cómo busco un viaje?',
    answer:
      'Ve a la sección "Buscar" en el menú principal. Ingresa tu origen y destino, fecha y hora. Verás múltiples opciones de viajes disponibles con conductores verificados.',
  },
  {
    id: '3',
    category: 'Pasajeros',
    question: '¿Cómo realizo una reserva?',
    answer:
      'Una vez encuentres un viaje que te interese, haz clic en la opción y selecciona el número de asientos. Confirma tu reserva y realiza el pago. Recibirás una confirmación con datos del conductor.',
  },
  {
    id: '4',
    category: 'Pasajeros',
    question: '¿Cuáles son los métodos de pago?',
    answer:
      'Aceptamos tarjeta de crédito/débito, billetera digital, transferencia bancaria y efectivo (en algunos casos). Todos los pagos son seguros y cifrados.',
  },
  {
    id: '5',
    category: 'Conductores',
    question: '¿Cómo me convierto en conductor?',
    answer:
      'Ve a tu Perfil y haz clic en "Conviértete en Conductor". Completa los pasos de verificación con tus documentos. Una vez aprobado, podrás crear rutas.',
  },
  {
    id: '6',
    category: 'Conductores',
    question: '¿Cuáles son los requisitos para ser conductor?',
    answer:
      'Debes ser mayor de 18 años, tener licencia de conducir válida, documento de identidad, vehículo en buen estado con seguro vigente, y historial limpio.',
  },
  {
    id: '7',
    category: 'Conductores',
    question: '¿Cómo creo una ruta?',
    answer:
      'En tu Panel de Conductor, haz clic en "Crear Nueva Ruta". Ingresa origen, destino, hora de salida/llegada, cantidad de asientos y precio por asiento. Publica y los pasajeros podrán hacer reservas.',
  },
  {
    id: '8',
    category: 'Conductores',
    question: '¿Cuánto dinero puedo ganar?',
    answer:
      'Esto depende de tus rutas, demanda y precio establecido. Trive no toma comisión fija. Recibes el 100% de lo que cobres por asientos (menos comisión de plataforma del 2%).',
  },
  {
    id: '9',
    category: 'Seguridad',
    question: '¿Es seguro viajar en Trive?',
    answer:
      'Sí, implementamos verificación de identidad para todos los usuarios, calificaciones de conductores y pasajeros, y soporte 24/7. Además, todos los pagos son seguros.',
  },
  {
    id: '10',
    category: 'Seguridad',
    question: '¿Qué pasa si hay un problema durante el viaje?',
    answer:
      'Contáctanos inmediatamente a través de la app o nuestro equipo de soporte. Documentamos cada caso y tomamos acción. Tenemos un proceso claro de resolución de conflictos.',
  },
  {
    id: '11',
    category: 'Cuentas',
    question: '¿Cómo cambio mi información de perfil?',
    answer:
      'Ve a tu Perfil, haz clic en "Editar Perfil" y realiza los cambios que necesites. Algunos datos como documento de identidad requieren reverificación.',
  },
  {
    id: '12',
    category: 'Cuentas',
    question: '¿Cómo elimino mi cuenta?',
    answer:
      'Ve a Configuración > Privacidad > Eliminar Cuenta. Sigue el proceso de confirmación. Ten en cuenta que esto es irreversible y perderás acceso a tu historial.',
  },
]

export default function HelpScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')

  const categories = ['Todos', ...new Set(FAQ_DATA.map((item) => item.category))]
  const filteredFAQ =
    selectedCategory === 'Todos' ? FAQ_DATA : FAQ_DATA.filter((item) => item.category === selectedCategory)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Preguntas Frecuentes</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Category Filters */}
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryBtn, selectedCategory === category && styles.categoryBtnActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[styles.categoryBtnText, selectedCategory === category && styles.categoryBtnTextActive]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FAQ Items */}
        <View style={styles.faqContainer}>
          {filteredFAQ.map((item) => (
            <View key={item.id}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.questionContent}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                  <Text style={styles.questionText}>{item.question}</Text>
                </View>
                <Ionicons
                  name={expandedId === item.id ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={COLORS.primary}
                />
              </TouchableOpacity>

              {expandedId === item.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.answerText}>{item.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Still Need Help */}
        <View style={styles.helpBox}>
          <Ionicons name="help-circle-outline" size={40} color={COLORS.primary} />
          <Text style={styles.helpTitle}>¿Aún necesitas ayuda?</Text>
          <Text style={styles.helpText}>Contáctanos en cualquier momento. Nuestro equipo está aquí para ti.</Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.contactBtnText}>Ir a Soporte</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    ...TYPOGRAPHY.h3,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  categoryContainer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryBtnText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  categoryBtnTextActive: {
    color: 'white',
  },
  faqContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  questionContent: {
    flex: 1,
    gap: SPACING.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  categoryBadgeText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 10,
  },
  questionText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  faqAnswer: {
    backgroundColor: COLORS.primary + '05',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
  },
  answerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  helpBox: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '08',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.xl,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  helpTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 20,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  helpText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  contactBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  contactBtnText: {
    ...TYPOGRAPHY.body,
    color: 'white',
    fontWeight: '600',
  },
})
