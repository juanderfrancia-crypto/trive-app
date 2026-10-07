import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'
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
      'Trive es una plataforma colombiana de viajes compartidos que conecta conductores y pasajeros. No somos una empresa de transporte público ni de taxis: somos tecnología que permite a conductores compartir sus trayectos con otros usuarios y dividir los gastos del recorrido.',
  },
  {
    id: '2',
    category: 'Pasajeros',
    question: '¿Cómo busco un viaje?',
    answer:
      'Ve a la pestaña "Viajes". Ingresa tu origen y destino, fecha y hora. Verás las opciones de viajes disponibles con conductores verificados.',
  },
  {
    id: '3',
    category: 'Pasajeros',
    question: '¿Cómo realizo una reserva?',
    answer:
      'Encuentra un viaje disponible, toca la opción y selecciona los asientos que necesitas. Confirma la reserva y recibirás una notificación con los datos del conductor. El pago lo acuerdas directamente con el conductor antes o durante el trayecto.',
  },
  {
    id: '4',
    category: 'Pasajeros',
    question: '¿Cuáles son los métodos de pago?',
    answer:
      'Puedes pagar en efectivo o por transferencia (Nequi, Daviplata o Bre-B, usando la llave que te muestra el conductor). El pago se realiza directamente entre pasajero y conductor; Trive no intermedia ni procesa cobros. Tu preferencia se guarda en Perfil > Cómo pagas.',
  },
  {
    id: '5',
    category: 'Conductores',
    question: '¿Cómo me convierto en conductor?',
    answer:
      'En tu perfil toca "Cambiar a modo Conductor". Completa los pasos de verificación con tus documentos. Una vez aprobado, podrás publicar rutas.',
  },
  {
    id: '6',
    category: 'Conductores',
    question: '¿Cuáles son los requisitos para ser conductor?',
    answer:
      'Debes ser mayor de 18 años, tener licencia de conducir vigente, cédula, SOAT vigente y un vehículo en buen estado.',
  },
  {
    id: '7',
    category: 'Conductores',
    question: '¿Cómo creo una ruta?',
    answer:
      'En "Mi panel" toca el botón + y elige "Crear ruta". Ingresa origen, destino, hora de salida, cantidad de asientos y precio por asiento. Publica y los pasajeros podrán reservar.',
  },
  {
    id: '8',
    category: 'Conductores',
    question: '¿Cuánto dinero puedo ganar?',
    answer:
      'Depende de tus rutas, la demanda y el precio que establezcas por asiento. Cada vez que publicas un viaje se descuentan $2.000 de tu billetera Trive. Si cancelas antes de pulsar "Salir" y no tienes reservas confirmadas, esos $2.000 vuelven a tu saldo. Si ya tienes reservas, o si la ruta sale, no hay devolución. El dinero que cobras a los pasajeros lo recibes tú directamente.',
  },
  {
    id: '9',
    category: 'Seguridad',
    question: '¿Es seguro viajar en Trive?',
    answer:
      'Sí. Todos los conductores pasan por verificación de documentos (cédula, licencia, SOAT). El sistema de calificaciones y reseñas mantiene la comunidad responsable. Además, puedes configurar un contacto de emergencia y usar el botón SOS en tu viaje activo para enviar tu ubicación GPS por WhatsApp.',
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
      'Ve a tu Perfil, toca "Datos personales" y realiza los cambios que necesites. Algunos datos como el documento de identidad requieren reverificación.',
  },
  {
    id: '12',
    category: 'Cuentas',
    question: '¿Cómo elimino mi cuenta?',
    answer:
      'Ve a Perfil > Privacidad y eliminar cuenta y sigue el proceso de confirmación. Ten en cuenta que esto es irreversible y perderás acceso a tu historial.',
  },
  {
    id: '13',
    category: 'Conductores',
    question: '¿Cómo funciona la billetera de conductor?',
    answer:
      'La billetera virtual de Trive almacena el saldo que usas para publicar rutas. Cada publicación descuenta $2.000 automáticamente. Puedes recargar saldo desde la sección "Billetera" en tu perfil. Los créditos del programa de referidos también se acreditan aquí.',
  },
  {
    id: '14',
    category: 'Conductores',
    question: '¿Qué es el programa de referidos?',
    answer:
      'Cada conductor activo tiene un código de referido único. Cuando otro conductor se registra en modo conductor usando tu código y publica su primer viaje, tú recibes $2.000 en tu billetera y él obtiene $1.000 de descuento en esa primera publicación. El beneficio aplica una sola vez por conductor nuevo.',
  },
  {
    id: '15',
    category: 'Seguridad',
    question: '¿Para qué sirve el botón SOS?',
    answer:
      'El botón SOS aparece en la tarjeta de tu viaje activo. Al tocarlo, la app abre WhatsApp con un mensaje pre-llenado para tu contacto de emergencia, incluyendo tu ubicación GPS en tiempo real, nombre del conductor y datos del vehículo (color, marca, placa). Configura tu contacto de emergencia en Perfil > Configuración > Seguridad y privacidad.',
  },
  {
    id: '16',
    category: 'Aeropuerto',
    question: '¿Qué son los viajes al aeropuerto?',
    answer:
      'Los viajes al aeropuerto son una modalidad personalizada de Trive donde un pasajero publica su solicitud de transporte hacia un aeropuerto colombiano (origen, destino, fecha/hora de vuelo, número de personas y precio ofrecido) y los conductores verificados pueden aceptarla. Es ideal para llegar puntual a tu vuelo con un conductor de confianza.',
  },
  {
    id: '17',
    category: 'Aeropuerto',
    question: '¿Cómo publico una solicitud de viaje al aeropuerto?',
    answer:
      'En la pantalla principal toca "¿Vas a otro lugar? Publica una ruta personalizada". Ingresa tu punto de origen, selecciona el aeropuerto de destino (o describe tu destino), elige la fecha y hora de salida, el número de personas y el precio que ofreces pagar. Toca "Publicar solicitud" y los conductores disponibles podrán verla y aceptarla. Recibirás una notificación cuando un conductor acepte tu viaje.',
  },
  {
    id: '18',
    category: 'Aeropuerto',
    question: '¿Cómo acepto una solicitud de aeropuerto como conductor?',
    answer:
      'En tu inicio de conductor toca "Rutas personalizadas". Verás las solicitudes activas con origen, destino, fecha y precio ofrecido. Toca "Aceptar" en la solicitud que te interese y confirma. Se descontarán $5.000 de tu billetera Trive como costo de intermediación. El pasajero recibirá una notificación de que aceptaste y ambos podrán coordinar los detalles del recorrido.',
  },
  {
    id: '19',
    category: 'Aeropuerto',
    question: '¿Por qué se descuentan $5.000 al conductor en viajes de aeropuerto?',
    answer:
      'Los $5.000 son el costo de intermediación tecnológica que Trive cobra al conductor al aceptar una solicitud de aeropuerto. Este valor es diferente a los $2.000 de las rutas regulares y no es una comisión sobre el precio del trayecto: lo que el pasajero paga es para el conductor. Si el pasajero cancela antes de que inicie el viaje, los $5.000 vuelven a tu saldo. Asegúrate de tener saldo suficiente antes de aceptar.',
  },
  {
    id: '20',
    category: 'Aeropuerto',
    question: '¿Qué aeropuertos están disponibles?',
    answer:
      'Están disponibles los 30 principales aeropuertos de Colombia, incluyendo El Dorado (Bogotá), José María Córdova (Medellín), Alfonso Bonilla Aragón (Cali), Rafael Núñez (Cartagena), Ernesto Cortissoz (Barranquilla) y muchos más. Al escribir el nombre de la ciudad o el código IATA, verás las sugerencias automáticamente.',
  },
]

export default function HelpScreen() {
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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Centro de ayuda</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          {categories.map((category) => {
            const active = selectedCategory === category
            return (
              <TouchableOpacity
                key={category}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{category}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {filteredFAQ.map((item) => {
          const open = expandedId === item.id
          return (
            <View key={item.id} style={[styles.faqCard, open && styles.faqCardOpen]}>
              <TouchableOpacity style={styles.faqQuestion} onPress={() => toggleExpand(item.id)} activeOpacity={0.75}>
                <View style={styles.questionContent}>
                  <Text style={styles.categoryBadgeText}>{item.category.toUpperCase()}</Text>
                  <Text style={styles.questionText}>{item.question}</Text>
                </View>
                <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={20} color={COLORS.primary} />
              </TouchableOpacity>

              {open && (
                <Text style={styles.answerText}>{item.answer}</Text>
              )}
            </View>
          )
        })}

        <View style={styles.helpCard}>
          <Illustration name="beginChat" width={150} />
          <Text style={styles.helpTitle}>¿Aún necesitas ayuda?</Text>
          <Text style={styles.helpText}>Escríbenos desde Soporte y te respondemos lo antes posible.</Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => navigation.navigate('Support' as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.contactBtnText}>Ir a Soporte</Text>
            <Icon name="ArrowRight" size={18} color={COLORS.white} />
          </TouchableOpacity>
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

  chipScroll: { flexGrow: 0, marginBottom: SPACING.md },
  chipRow: { gap: SPACING.sm, paddingRight: SPACING.lg },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white, fontWeight: TYPOGRAPHY.weight.bold },

  faqCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  faqCardOpen: { borderWidth: 1.5, borderColor: COLORS.primaryTint },
  faqQuestion: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  questionContent: { flex: 1, gap: SPACING.xs },
  categoryBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.primary,
    letterSpacing: 0.6,
  },
  questionText: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  answerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  helpCard: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryTint,
  },
  helpTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold, marginTop: SPACING.md },
  helpText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs, marginBottom: SPACING.lg },
  contactBtn: {
    ...SHADOWS.xs,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    alignSelf: 'stretch',
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  contactBtnText: { ...TYPOGRAPHY.button, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.white },
})
