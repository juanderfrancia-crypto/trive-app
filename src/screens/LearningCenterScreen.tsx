import { View, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon, { type IconName } from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'
import { useNavigation } from '@react-navigation/native'
import { useState } from 'react'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

interface Tutorial {
  id: string
  title: string
  category: string
  duration: string
  icon: IconName
  description: string
  steps: string[]
}

const TUTORIALS: Tutorial[] = [
    {
      id: '1',
      title: 'Cómo crear tu cuenta',
      category: 'Inicio',
      duration: '5 min',
      icon: 'UserPlus',
      description: 'Aprende el proceso paso a paso para crear tu cuenta',
      steps: [
        "1. Abre la app y escribe tu número de celular",
        "2. Toca \"Enviar código\" y escribe el código de 6 dígitos que llega por SMS",
        "3. Escribe tu nombre completo para terminar el registro",
        "4. ¿Prefieres correo? En la pantalla de inicio toca \"Regístrate con tu correo\", confirma el código que te enviamos y luego verifica tu celular",
        "5. ¡Listo! Ya puedes usar Trive"
      ],
    },
    {
      id: '2',
      title: 'Buscar y Reservar un Viaje',
      category: 'Pasajero',
      duration: '8 min',
      icon: 'Search',
      description: 'Guía completa para encontrar y reservar tu viaje ideal',
      steps: [
        "1. En la pestaña Viajes, ingresa origen y destino",
        "2. Selecciona la fecha y hora del viaje",
        "3. Toca el botón de búsqueda y revisa los viajes disponibles con precio y conductor",
        "4. Toca el viaje que te interese, elige tu asiento y confirma la reserva",
        "5. Coordina el pago con el conductor: efectivo o transferencia (Nequi, Daviplata o Bre-B). Tu forma preferida se preselecciona; puedes cambiarla en Perfil > Cómo pagas",
        "6. Acuerden el punto de encuentro por el chat del viaje"
      ],
    },
    {
      id: '3',
      title: 'Cómo Convertirse en Conductor',
      category: 'Conductor',
      duration: '10 min',
      icon: 'Car',
      description: 'Requisitos y pasos para comenzar a ganar dinero con Trive',
      steps: [
        "1. En tu perfil, toca \"Cambiar a modo Conductor\"",
        "2. Revisa los requisitos: ser mayor de 18 años, licencia de conducir vigente, cédula, SOAT y vehículo en buen estado",
        "3. Si un conductor te invitó, ingresa su código de referido (es opcional)",
        "4. Sube tus documentos y los datos de tu vehículo",
        "5. Espera la verificación de tus documentos (24 a 48 horas)",
        "6. Cuando estén aprobados, podrás publicar rutas"
      ],
    },
    {
      id: '4',
      title: 'Crear y Publicar un Viaje',
      category: 'Conductor',
      duration: '7 min',
      icon: 'Map',
      description: 'Cómo crear tu primer viaje como conductor',
      steps: [
        "1. Ve a \"Mi panel\" y toca el botón +",
        "2. Elige \"Crear ruta\", o \"Rutas frecuentes\" si ya guardaste una plantilla",
        "3. Ingresa origen, destino, fecha, hora de salida y precio por puesto",
        "4. Indica los asientos disponibles y el vehículo",
        "5. Publica la ruta: se descuentan $2.000 de tu billetera",
        "6. Espera a que se reserven tus pasajeros y coordina con ellos"
      ],
    },
    {
      id: '5',
      title: 'Métodos de Pago Disponibles',
      category: 'Seguridad',
      duration: '4 min',
      icon: 'Banknote',
      description: 'Conoce las formas de pago aceptadas en Trive',
      steps: [
        "1. Los medios de pago son efectivo, Nequi, Daviplata y Bre-B",
        "2. Trive no cobra ni retiene el pago del viaje: lo pagas directo al conductor",
        "3. En Nequi, Daviplata o Bre-B, paga a la llave que el conductor te muestra (número, cédula, correo o alias)",
        "4. En efectivo, paga al llegar al destino o según lo acordado",
        "5. Guarda el comprobante de la transferencia como respaldo",
        "6. Puedes elegir tu forma de pago preferida en Perfil > Cómo pagas",
        "7. Si tienes un problema con un pago, escríbele primero al conductor por el chat. Si no se resuelve, repórtalo en la app dentro de las 24 horas siguientes al viaje"
      ],
    },
    {
      id: '6',
      title: 'Sistema de Calificaciones y Reputación',
      category: 'Seguridad',
      duration: '7 min',
      icon: 'Star',
      description: 'Entiende cómo funcionan las calificaciones en Trive',
      steps: [
        "1. Cada viaje completado puede calificarse con 1 a 5 estrellas",
        "2. Puedes dejar un comentario escrito",
        "3. Los conductores ven su calificación promedio en su perfil",
        "4. Según el promedio, el perfil muestra: Bueno y confiable (desde 4.0), Excelente (desde 4.5) y Premium (desde 4.7)",
        "5. Sé puntual y respetuoso: las calificaciones de los demás son las que construyen tu reputación"
      ],
    },
    {
      id: '8',
      title: 'Chat durante el Viaje',
      category: 'Pasajero',
      duration: '4 min',
      icon: 'MessageCircle',
      description: 'Cómo comunicarte con el conductor o los pasajeros',
      steps: [
        '1. Una vez confirmada tu reserva, accede a la tarjeta del viaje',
        '2. Toca el ícono de chat para abrir la conversación',
        '3. Puedes escribir mensajes al conductor para coordinar el punto de encuentro',
        '4. Los conductores también pueden escribirle a sus pasajeros',
        '5. Recibirás una notificación en Alertas cuando llegue un mensaje nuevo',
        '6. Desde Alertas puedes responder mensajes directamente sin abrir el chat',
      ],
    },
    {
      id: '9',
      title: 'Billetera y Programa de Referidos',
      category: 'Conductor',
      duration: '6 min',
      icon: 'Wallet',
      description: 'Gestiona tu saldo y gana créditos invitando conductores',
      steps: [
        "1. En tu perfil de conductor, toca \"Ver billetera\" para ver tu saldo",
        "2. Cada publicación de ruta descuenta $2.000",
        "3. Para recargar, toca \"Recargar\" y elige el monto",
        "4. Tu código de referido está en tu perfil, en \"Referidos\"",
        "5. Compártelo con otros conductores",
        "6. Cuando el conductor referido publique su primer viaje, recibes $2.000 en tu billetera",
        "7. Él recibe $1.000 de descuento en esa primera publicación",
        '8. Si cancelas antes de pulsar "Salir" y no tienes reservas confirmadas, los $2.000 vuelven a tu saldo. Con reservas, o si la ruta sale, no hay devolución'
      ],
    },
    {
      id: '10',
      title: 'Solicitar un Viaje al Aeropuerto',
      category: 'Pasajero',
      duration: '5 min',
      icon: 'Plane',
      description: 'Cómo publicar tu solicitud y que un conductor te lleve al aeropuerto',
      steps: [
        '1. En la pantalla principal toca "¿Vas a otro lugar? Publica una ruta personalizada"',
        '2. Escribe tu punto de origen (dirección o barrio de salida)',
        '3. En el campo destino, escribe el nombre del aeropuerto o la ciudad; elige de la lista que aparece',
        '4. Ingresa la fecha de tu vuelo en formato DD/MM/AAAA',
        '5. Ingresa la hora de salida deseada en formato HH:MM',
        '6. Selecciona el número de personas que viajarán',
        '7. Escribe el precio que ofreces pagar al conductor',
        '8. Agrega una nota opcional (equipaje, instrucciones especiales, etc.)',
        '9. Toca "Publicar solicitud" — los conductores disponibles podrán verla',
        '10. Recibirás una notificación cuando un conductor acepte tu viaje',
      ],
    },
    {
      id: '11',
      title: 'Aceptar Solicitudes de Aeropuerto',
      category: 'Conductor',
      duration: '5 min',
      icon: 'Plane',
      description: 'Cómo ver y aceptar solicitudes de pasajeros que van al aeropuerto',
      steps: [
        "1. En tu inicio de conductor, toca \"Rutas personalizadas\"",
        "2. Verás las solicitudes activas con origen, destino, fecha, hora y precio ofrecido",
        "3. Revisa el número de personas, las notas y el precio",
        "4. Toca \"Aceptar\" en la solicitud que te interese",
        "5. Confirma: se descontarán $5.000 de tu billetera Trive",
        "6. Si no tienes saldo suficiente, la solicitud no se acepta: recarga tu billetera y vuelve a intentarlo",
        "7. El pasajero recibe una notificación de que aceptaste",
        "8. Coordina con el pasajero el punto de encuentro y la forma de pago",
        "9. Si el pasajero cancela antes del viaje, los $5.000 vuelven a tu saldo"
      ],
    },
      {
      id: '12',
      title: 'Guardar Rutas Favoritas',
      category: 'Pasajero',
      duration: '3 min',
      icon: 'Heart',
      description: 'Guarda las rutas que usas seguido para buscarlas más rápido',
      steps: [
        '1. En la pestaña Viajes, busca tu ruta y revisa los resultados',
        '2. Toca el corazón de la tarjeta del viaje para guardarla. Tocarlo otra vez la quita',
        '3. Para verlas, ve a Perfil > Configuración > Viajes > Rutas favoritas',
        '4. Toca "Buscar esta ruta" para buscarla directamente',
        '5. Para quitar una favorita, toca el ícono de papelera en su tarjeta',
      ],
    },
  ]

const CATEGORIES = ['Todos', 'Inicio', 'Pasajero', 'Conductor', 'Seguridad']

export default function LearningCenterScreen() {
  const navigation = useNavigation()
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [expandedIds, setExpandedIds] = useState<string[]>([])

  const toggle = (id: string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const visible = selectedCategory === 'Todos'
    ? TUTORIALS
    : TUTORIALS.filter((t) => t.category === selectedCategory)

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Centro de aprendizaje</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {CATEGORIES.map((category) => {
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

        {visible.map((tutorial) => {
          const open = expandedIds.includes(tutorial.id)
          return (
            <View key={tutorial.id} style={[styles.card, open && styles.cardOpen]}>
              <TouchableOpacity style={styles.cardTop} onPress={() => toggle(tutorial.id)} activeOpacity={0.75}>
                <View style={styles.tile}>
                  <Icon name={tutorial.icon} size={20} color={COLORS.primary} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.meta}>{tutorial.category.toUpperCase()} · {tutorial.duration}</Text>
                  <Text style={styles.cardTitle}>{tutorial.title}</Text>
                  <Text style={styles.cardDesc}>{tutorial.description}</Text>
                </View>
                <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={20} color={COLORS.primary} />
              </TouchableOpacity>

              {open && (
                <View style={styles.steps}>
                  {tutorial.steps.map((step, index) => (
                    <View key={index} style={styles.step}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step.replace(/^\d+\.\s*/, '')}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        })}

        <View style={styles.helpCard}>
          <Illustration name="personalFile" width={140} />
          <Text style={styles.helpTitle}>¿Te quedó alguna duda?</Text>
          <Text style={styles.helpText}>Revisa las preguntas frecuentes o escríbenos desde Soporte.</Text>
          <TouchableOpacity style={styles.helpBtn} onPress={() => navigation.navigate('Help' as never)} activeOpacity={0.85}>
            <Text style={styles.helpBtnText}>Ir a preguntas frecuentes</Text>
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
  chipRow: { gap: SPACING.sm, paddingRight: SPACING.lg, marginBottom: SPACING.lg },
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

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardOpen: { borderWidth: 1.5, borderColor: COLORS.primaryTint },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  tile: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 2 },
  meta: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary, letterSpacing: 0.5 },
  cardTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  cardDesc: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },

  steps: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: SPACING.md,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary },
  stepText: { ...TYPOGRAPHY.labelMedium, flex: 1, color: COLORS.textSecondary, paddingTop: 2, lineHeight: 20 },

  helpCard: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryTint,
  },
  helpTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold, marginTop: SPACING.md },
  helpText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs, marginBottom: SPACING.lg },
  helpBtn: {
    alignSelf: 'stretch',
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBtnText: { ...TYPOGRAPHY.button, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.white },
})
