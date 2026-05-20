import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useState } from 'react'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

interface Tutorial {
  id: string
  title: string
  category: string
  duration: string
  icon: string
  description: string
  steps: string[]
  expanded?: boolean
}

export default function LearningCenterScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const [tutorials, setTutorials] = useState<Tutorial[]>([
    {
      id: '1',
      title: 'Cómo Registrarte en Trive',
      category: 'Inicio',
      duration: '5 min',
      icon: 'person-add-outline',
      description: 'Aprende el proceso paso a paso para crear tu cuenta',
      steps: [
        '1. Abre la aplicación y toca "Crear Cuenta"',
        '2. Ingresa tu nombre completo, correo electrónico, número de teléfono y contraseña',
        '3. Revisa tu bandeja de entrada y confirma tu correo con el enlace que recibirás',
        '4. Una vez verificado el correo, inicia sesión con tus datos',
        '5. ¡Listo! Ya puedes usar Trive como pasajero',
      ],
      expanded: false
    },
    {
      id: '2',
      title: 'Buscar y Reservar un Viaje',
      category: 'Pasajero',
      duration: '8 min',
      icon: 'search-outline',
      description: 'Guía completa para encontrar y reservar tu viaje ideal',
      steps: [
        '1. En la pantalla principal, ingresa origen y destino',
        '2. Selecciona la fecha y hora del viaje',
        '3. Toca "Buscar Viajes"',
        '4. Revisa los viajes disponibles con precio, duración y conductor',
        '5. Elige tu viaje y toca "Reservar"',
        '6. Selecciona el asiento que deseas ocupar',
        '7. Acuerda el pago con el conductor (Nequi, Daviplata o efectivo) y coordina el punto de encuentro'
      ],
      expanded: false
    },
    {
      id: '3',
      title: 'Cómo Convertirse en Conductor',
      category: 'Conductor',
      duration: '10 min',
      icon: 'car-outline',
      description: 'Requisitos y pasos para comenzar a ganar dinero con Trive',
      steps: [
        '1. Ve a tu Perfil y toca "Conviértete en Conductor"',
        '2. Revisa los requisitos necesarios (mayor de 18 años, cédula, etc)',
        '3. Confirma los términos y condiciones',
        '4. Completa tu información de vehículo',
        '5. Carga tu licencia y documentos requeridos',
        '6. Espera a que se verifiquen tus documentos (24-48 horas)',
        '7. ¡Comienza a crear viajes y ganar dinero!'
      ],
      expanded: false
    },
    {
      id: '4',
      title: 'Crear y Publicar un Viaje',
      category: 'Conductor',
      duration: '7 min',
      icon: 'map-outline',
      description: 'Cómo crear tu primer viaje como conductor',
      steps: [
        '1. En el Panel del Conductor, toca "Crear Nuevo Viaje"',
        '2. Ingresa el punto de partida y destino',
        '3. Selecciona fecha y hora de salida',
        '4. Establece el precio por pasajero',
        '5. Selecciona el número de asientos disponibles',
        '6. Añade notas adicionales si lo deseas (preferencias del viaje, etc)',
        '7. Publica el viaje (se descuentan $2.000 de tu billetera automáticamente)',
        '8. Espera a que se confirmen los pasajeros'
      ],
      expanded: false
    },
    {
      id: '5',
      title: 'Métodos de Pago Disponibles',
      category: 'Seguridad',
      duration: '4 min',
      icon: 'cash-outline',
      description: 'Conoce las formas de pago aceptadas en Trive',
      steps: [
        '1. Los métodos de pago disponibles son: Nequi, Daviplata y efectivo',
        '2. El método se acuerda directamente con el conductor al reservar',
        '3. Nequi y Daviplata: el pasajero transfiere al número del conductor',
        '4. Efectivo: se paga al inicio o al final del trayecto según acuerdo',
        '5. Guarda el comprobante de transferencia como respaldo del pago',
        '6. Ante cualquier duda sobre el pago, contacta a soporte Trive'
      ],
      expanded: false
    },
    {
      id: '6',
      title: 'Sistema de Calificaciones y Reputación',
      category: 'Seguridad',
      duration: '7 min',
      icon: 'star-outline',
      description: 'Entiende cómo funcionan las calificaciones en Trive',
      steps: [
        '1. Cada viaje puede ser calificado después de completarlo',
        '2. Escala de 1-5 estrellas (5 es excelente)',
        '3. Los conductores ven calificación promedio en su perfil',
        '4. Los pasajeros pueden dejar comentarios escritos',
        '5. Mantener una calificación ≥4.0 desbloquea el badge "Conductor Confiable"',
        '6. Con ≥4.5 obtienes el badge "Conductor Excelente", visible en tu perfil',
        '7. Sé puntual y respetuoso para mantener buena reputación en la comunidad'
      ],
      expanded: false
    },
    {
      id: '7',
      title: 'Rutas Favoritas',
      category: 'Pasajero',
      duration: '3 min',
      icon: 'heart-outline',
      description: 'Guarda rutas que usas frecuentemente para buscarlas más rápido',
      steps: [
        '1. En los resultados de búsqueda, toca el ícono ♡ en la esquina superior derecha de cualquier card',
        '2. La ruta quedará guardada en tu lista de favoritos',
        '3. Para ver tus favoritas, ve a Configuración > Mis Rutas Favoritas',
        '4. Desde ahí toca "Buscar esta ruta" para buscar esa ruta directamente',
        '5. Para eliminar una favorita, toca el ícono de papelera en la tarjeta',
        '6. Las rutas favoritas se guardan en tu dispositivo y se sincronizan con tu cuenta'
      ],
      expanded: false
    },
    {
      id: '8',
      title: 'Chat durante el Viaje',
      category: 'Pasajero',
      duration: '4 min',
      icon: 'chatbubble-outline',
      description: 'Cómo comunicarte con el conductor o los pasajeros',
      steps: [
        '1. Una vez confirmada tu reserva, accede a la tarjeta del viaje',
        '2. Toca el ícono de chat para abrir la conversación',
        '3. Puedes escribir mensajes al conductor para coordinar el punto de encuentro',
        '4. Los conductores también pueden escribirle a sus pasajeros',
        '5. Recibirás una notificación en Alertas cuando llegue un mensaje nuevo',
        '6. Desde Alertas puedes responder mensajes directamente sin abrir el chat',
      ],
      expanded: false
    },
    {
      id: '9',
      title: 'Billetera y Programa de Referidos',
      category: 'Conductor',
      duration: '6 min',
      icon: 'wallet-outline',
      description: 'Gestiona tu saldo y gana créditos invitando conductores',
      steps: [
        '1. Ve a tu Perfil y toca "Billetera" para ver tu saldo actual',
        '2. Cada publicación de ruta descuenta $2.000 automáticamente',
        '3. Para recargar saldo, toca "Recargar" y elige el monto',
        '4. Tu código de referido único está en Perfil > Referidos',
        '5. Comparte tu código con otros conductores',
        '6. Cuando el conductor referido publique su primer viaje, recibes $2.000 en tu billetera',
        '7. El conductor nuevo obtiene $1.000 de descuento en esa primera publicación',
      ],
      expanded: false
    },
  ])

  const toggleTutorial = (id: string) => {
    setTutorials(tutorials.map(t =>
      t.id === id ? { ...t, expanded: !t.expanded } : t
    ))
  }

  const categories = ['Todos', ...Array.from(new Set(tutorials.map(t => t.category)))]
  const [selectedCategory, setSelectedCategory] = useState('Todos')

  const filteredTutorials = selectedCategory === 'Todos'
    ? tutorials
    : tutorials.filter(t => t.category === selectedCategory)

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Centro de Aprendizaje</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Welcome Section */}
        <View style={styles.section}>
          <View style={styles.welcomeBox}>
            <Ionicons name="book-outline" size={48} color={COLORS.primary} />
            <Text style={styles.welcomeTitle}>Aprende a Usar Trive</Text>
            <Text style={styles.welcomeText}>
              Tutoriales paso a paso para sacar el máximo provecho de nuestros servicios
            </Text>
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryPill,
                  selectedCategory === category && styles.categoryPillActive
                ]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.categoryPillText,
                  selectedCategory === category && styles.categoryPillTextActive
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tutorials List */}
        <View style={styles.tutorialsSection}>
          {filteredTutorials.map((tutorial) => (
            <View key={tutorial.id} style={styles.tutorialContainer}>
              <TouchableOpacity
                style={styles.tutorialHeader}
                onPress={() => toggleTutorial(tutorial.id)}
                activeOpacity={0.7}
              >
                <View style={styles.tutorialIconBox}>
                  <Ionicons
                    name={tutorial.icon as any}
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
                
                <View style={styles.tutorialInfo}>
                  <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
                  <View style={styles.tutorialMeta}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{tutorial.category}</Text>
                    </View>
                    <Text style={styles.tutorialDuration}>⏱ {tutorial.duration}</Text>
                  </View>
                  <Text style={styles.tutorialDescription}>{tutorial.description}</Text>
                </View>

                <Ionicons
                  name={tutorial.expanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={COLORS.textTertiary}
                />
              </TouchableOpacity>

              {tutorial.expanded && (
                <View style={styles.tutorialContent}>
                  <View style={styles.stepsContainer}>
                    {tutorial.steps.map((step, index) => (
                      <View key={index} style={styles.stepItem}>
                        <View style={styles.stepNumber}>
                          <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.completedBox}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                    <Text style={styles.completedText}>¿Dudas? Contacta a soporte</Text>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Consejos Útiles</Text>
          
          <View style={styles.tipCard}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
            <Text style={styles.tipText}>Siempre verifica el perfil del conductor/pasajero antes de aceptar un viaje</Text>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="star-outline" size={20} color={COLORS.primary} />
            <Text style={styles.tipText}>Califica honestamente los viajes para ayudar a la comunidad de Trive</Text>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
            <Text style={styles.tipText}>Como conductor, recuerda que publicar cada viaje descuenta $2.000 de tu billetera Trive. Mantén saldo suficiente para publicar rutas sin interrupciones</Text>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
            <Text style={styles.tipText}>Configura tu contacto de emergencia en Configuración {'>'} Seguridad. El botón SOS en tu viaje activo enviará tu ubicación GPS en tiempo real junto con los datos del conductor por WhatsApp</Text>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaBox}>
            <Text style={styles.ctaTitle}>¿Aún tienes preguntas?</Text>
            <Text style={styles.ctaText}>Consulta nuestras Preguntas Frecuentes o contacta directamente con soporte</Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.navigate('Help' as never)}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>Ir a Preguntas Frecuentes</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.background} />
            </TouchableOpacity>
          </View>
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
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  welcomeBox: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '08',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  welcomeTitle: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  welcomeText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  filterSection: {
    paddingVertical: SPACING.lg,
  },
  categoryScroll: {
    paddingHorizontal: SPACING.lg,
  },
  categoryPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryPillText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: COLORS.background,
  },
  tutorialsSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  tutorialContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  tutorialHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  tutorialIconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  tutorialInfo: {
    flex: 1,
  },
  tutorialTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  tutorialMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
  },
  categoryBadgeText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 11,
  },
  tutorialDuration: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  tutorialDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  tutorialContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  stepsContainer: {
    marginBottom: SPACING.lg,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  stepNumberText: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.background,
    fontSize: 14,
  },
  stepText: {
    ...TYPOGRAPHY.body,
    flex: 1,
    color: COLORS.textPrimary,
    lineHeight: 20,
    paddingTop: 4,
  },
  completedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '12',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  completedText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.success,
    marginLeft: SPACING.sm,
    fontWeight: '500',
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  tipText: {
    ...TYPOGRAPHY.body,
    marginLeft: SPACING.md,
    flex: 1,
    lineHeight: 20,
  },
  ctaSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  ctaBox: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  ctaTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.background,
    marginBottom: SPACING.sm,
  },
  ctaText: {
    ...TYPOGRAPHY.body,
    color: COLORS.background,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  ctaButtonText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: SPACING.sm,
  },
})
