import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  return (
    <View style={[s.safe, { paddingTop: insets.top }]}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Política de Privacidad</Text>
          <View style={{ width: 28 }} />
        </View>

        <Text style={s.company}>Trive Technologies SAS</Text>
        <Text style={s.law}>Conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013</Text>
        <Text style={s.date}>Última actualización: 3 de mayo de 2026</Text>

        <Section title="1. Responsable del tratamiento">
          <B>Trive Technologies SAS</B>{'\n'}
          Ciudad: Cali, Colombia{'\n'}
          Correo: privacy@trive.co
        </Section>

        <Section title="2. Datos personales que recopilamos">
          <B>a) Datos de identificación:</B> nombre completo, número de teléfono celular, correo electrónico.{'\n\n'}
          <B>b) Datos del vehículo (conductores):</B> marca, modelo, color, placa y fotografía del vehículo.{'\n\n'}
          <B>c) Datos de ubicación:</B> coordenadas GPS durante el uso de la Plataforma, para facilitar la conexión entre conductor y pasajero.{'\n\n'}
          <B>d) Datos de uso:</B> historial de trayectos, calificaciones, reseñas y mensajes internos en la Plataforma.{'\n\n'}
          <B>e) Datos técnicos:</B> token del dispositivo para notificaciones push, sistema operativo y versión de la aplicación.{'\n\n'}
          <B>f) Fotografía de perfil:</B> de forma opcional, cargada por el usuario.{'\n\n'}
          <B>g) Datos del programa de referidos (conductores):</B> código de referido generado por la Plataforma para cada conductor activo y, en caso de aplicar, el código del conductor que lo refirió. Estos datos se utilizan exclusivamente para calcular y acreditar los beneficios del programa de referidos.
        </Section>

        <Section title="3. Finalidades del tratamiento">
          Tus datos personales serán tratados para:{'\n\n'}
          • Crear y gestionar tu cuenta de usuario.{'\n'}
          • Facilitar la conexión entre conductores y pasajeros.{'\n'}
          • Mostrar tu ubicación aproximada para la planificación del trayecto.{'\n'}
          • Enviarte notificaciones relacionadas con el servicio.{'\n'}
          • Verificar la identidad de los conductores mediante revisión de documentos.{'\n'}
          • Calcular calificaciones y reputación de usuarios.{'\n'}
          • Gestionar el programa de referidos entre conductores y acreditar los beneficios correspondientes.{'\n'}
          • Mejorar la Plataforma mediante análisis estadísticos anonimizados.{'\n'}
          • Cumplir obligaciones legales vigentes.
        </Section>

        <Section title="4. Base legal del tratamiento">
          El tratamiento de tus datos se realiza con base en:{'\n\n'}
          • Tu <B>consentimiento expreso</B> otorgado al momento del registro (Art. 9, Ley 1581 de 2012).{'\n'}
          • La ejecución del acuerdo de uso de la Plataforma.{'\n'}
          • El cumplimiento de obligaciones legales.
        </Section>

        <Section title="5. Derechos del titular">
          De conformidad con el artículo 8 de la Ley 1581 de 2012, tienes derecho a:{'\n\n'}
          • <B>Conocer</B> los datos personales que Trive tiene sobre ti.{'\n'}
          • <B>Actualizar</B> tus datos cuando sean inexactos o incompletos.{'\n'}
          • <B>Suprimir</B> tus datos cuando no sean necesarios para las finalidades declaradas.{'\n'}
          • <B>Revocar</B> la autorización otorgada para el tratamiento.{'\n'}
          • <B>Acceder</B> gratuitamente a tus datos personales.{'\n'}
          • <B>Presentar quejas</B> ante la Superintendencia de Industria y Comercio (SIC).{'\n\n'}
          Para ejercer estos derechos escríbenos a <B>privacy@trive.co</B>. Responderemos dentro de los <B>10 días hábiles</B> siguientes a la recepción de tu solicitud, conforme al artículo 14 de la Ley 1581 de 2012.
        </Section>

        <Section title="6. Transferencia de datos a terceros">
          Trive utiliza los siguientes proveedores tecnológicos que pueden acceder a tus datos como encargados del tratamiento:{'\n\n'}
          • <B>Supabase Inc.</B> — infraestructura de base de datos y autenticación. Servidores en Estados Unidos, bajo acuerdos de protección de datos compatibles con estándares internacionales.{'\n'}
          • <B>Expo (Expo Inc.)</B> — envío de notificaciones push.{'\n\n'}
          No vendemos, arrendamos ni cedemos tus datos a terceros con fines comerciales.
        </Section>

        <Section title="7. Seguridad de los datos">
          Trive implementa las siguientes medidas de seguridad:{'\n\n'}
          • Cifrado de datos en tránsito mediante HTTPS/TLS.{'\n'}
          • Autenticación segura mediante OTP y tokens de sesión.{'\n'}
          • Acceso restringido a datos personales según rol de usuario.{'\n'}
          • Políticas de seguridad internas para el equipo de Trive.
        </Section>

        <Section title="8. Retención de datos">
          Tus datos se conservarán mientras tu cuenta esté activa. Al eliminar tu cuenta, tus datos serán suprimidos en un plazo máximo de <B>30 días calendario</B>, salvo obligación legal de conservarlos por un período mayor.
        </Section>

        <Section title="9. Menores de edad">
          La Plataforma no está dirigida a personas menores de 18 años. Si identificamos que un usuario menor de edad ha creado una cuenta, procederemos a eliminarla de inmediato.
        </Section>

        <Section title="10. Modificaciones">
          Trive podrá modificar esta Política en cualquier momento, notificando los cambios a través de la Plataforma. El uso continuado tras la notificación implica la aceptación de la nueva política.
        </Section>

        {/* SIC */}
        <View style={s.sicBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
          <Text style={s.sicText}>
            Si consideras que tu derecho a la protección de datos ha sido vulnerado, puedes presentar una queja ante la{' '}
            <Text style={s.sicLink} onPress={() => Linking.openURL('https://www.sic.gov.co')}>
              Superintendencia de Industria y Comercio (SIC) — www.sic.gov.co
            </Text>
          </Text>
        </View>

        {/* Contacto */}
        <View style={s.contactBox}>
          <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={s.contactLabel}>Canal de atención de datos personales</Text>
            <Text style={s.contactValue}>privacy@trive.co</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  )
}

function B({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontWeight: '700' }}>{children}</Text>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Text style={s.sectionBody}>{children}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { flex: 1 },
  content: { paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  company: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: SPACING.xl,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  law: {
    fontSize: 11.5,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  date: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    fontStyle: 'italic',
  },

  section: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 22,
    letterSpacing: 0.2,
  },

  sicBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: '#EEF4FF',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
  },
  sicText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  sicLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary + '08',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
})
