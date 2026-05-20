import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'

export default function TermsOfServiceScreen() {
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
          <Text style={s.headerTitle}>Términos de Uso</Text>
          <View style={{ width: 28 }} />
        </View>

        <Text style={s.company}>Trive Technologies SAS</Text>
        <Text style={s.date}>Última actualización: 3 de mayo de 2026</Text>

        <Section title="1. Aceptación de los términos">
          Al descargar, instalar o utilizar la aplicación Trive, declaras haber leído, entendido y aceptado estos Términos de Uso en su totalidad. Si no estás de acuerdo con alguno de estos términos, debes abstenerte de utilizar la Plataforma.
        </Section>

        <Section title="2. Naturaleza del servicio">
          Trive Technologies SAS opera exclusivamente como una plataforma tecnológica de intermediación que facilita la conexión entre particulares que deseen compartir un vehículo y los costos de un trayecto.{'\n\n'}
          Trive no es una empresa de transporte público, privado colectivo ni individual, ni presta servicios de taxi o similares. Los trayectos publicados corresponden a viajes que los conductores ya tienen planeado realizar, en los cuales ofrecen puestos disponibles a otros usuarios para compartir gastos de desplazamiento.
        </Section>

        <Section title="3. Requisitos para el uso">
          Para utilizar Trive debes:{'\n\n'}
          • Ser mayor de 18 años.{'\n'}
          • Proporcionar información veraz, completa y actualizada.{'\n'}
          • Contar con un número de teléfono celular activo en Colombia.{'\n'}
          • Aceptar el tratamiento de tus datos conforme a nuestra Política de Privacidad.
        </Section>

        <Section title="4. Registro y cuenta">
          Eres responsable de mantener la confidencialidad de tu cuenta y de todas las actividades realizadas desde ella. Debes notificarnos de inmediato ante cualquier uso no autorizado escribiendo a privacy@trive.co.
        </Section>

        <Section title="5. Conductores">
          Los usuarios que publiquen rutas deben:{'\n\n'}
          • Poseer licencia de conducción vigente y válida en Colombia.{'\n'}
          • Ser propietarios del vehículo o contar con autorización expresa para conducirlo.{'\n'}
          • Mantener documentos del vehículo al día: SOAT y revisión técnico-mecánica vigentes.{'\n'}
          • Publicar únicamente trayectos que efectivamente vayan a realizar.{'\n'}
          • Contar con saldo suficiente en su billetera de Trive antes de publicar. Cada publicación descuenta automáticamente $2.000 del saldo disponible; si el saldo es insuficiente, la publicación no se procesará.{'\n'}
          • No cobrar un valor superior al de los gastos reales del trayecto (combustible, peajes y desgaste del vehículo). Trive es una plataforma de compartición de gastos, no de lucro por transporte.
        </Section>

        <Section title="6. Pasajeros">
          Los usuarios que reserven puestos deben:{'\n\n'}
          • Presentarse puntualmente en el punto de encuentro acordado.{'\n'}
          • Tratar al conductor y demás pasajeros con respeto.{'\n'}
          • Respetar las normas de convivencia durante el trayecto.{'\n'}
          • Reportar cualquier incidente a través de los canales oficiales de Trive.
        </Section>

        <Section title="7. Tarifas y pagos">
          Las tarifas publicadas representan la contribución del pasajero a los gastos del trayecto. El pago se acuerda y realiza directamente entre conductor y pasajero mediante los métodos que ellos acuerden (Nequi, Daviplata, efectivo u otros). Trive no intermedia ni procesa dichos pagos.{'\n\n'}
          La publicación de cada trayecto tiene un costo fijo de $2.000 que se descuenta automáticamente del saldo de la billetera virtual del conductor en Trive. Este valor cubre el servicio de intermediación tecnológica y no constituye comisión sobre el precio del trayecto. El saldo de la billetera puede recargarse a través de los métodos habilitados en la Plataforma.{'\n\n'}
          <B>Programa de referidos:</B> los conductores cuentan con un código personal de referido. Cuando un conductor nuevo se registra usando ese código y publica su primer trayecto, el conductor referidor recibe un crédito de $2.000 en su billetera y el conductor nuevo obtiene un descuento de $1.000 en esa primera publicación. Este beneficio aplica una sola vez por conductor nuevo.
        </Section>

        <Section title="8. Cancelaciones">
          Conductores y pasajeros pueden cancelar una reserva antes del inicio del trayecto. Las cancelaciones reiteradas sin justificación podrán dar lugar a restricciones en el uso de la Plataforma. Trive no garantiza reembolsos en caso de cancelación por parte del conductor, sin perjuicio de los derechos reconocidos a los consumidores por la Ley 1480 de 2011.
        </Section>

        <Section title="9. Conducta prohibida">
          Está terminantemente prohibido:{'\n\n'}
          • Utilizar la Plataforma para ofrecer servicios de transporte remunerado (taxi, transporte especial, etc.).{'\n'}
          • Publicar información falsa o engañosa.{'\n'}
          • Discriminar a otros usuarios por razón de raza, sexo, religión, orientación sexual u otra condición.{'\n'}
          • Realizar actividades ilícitas durante los trayectos.{'\n'}
          • Acosar, amenazar o agredir a otros usuarios.
        </Section>

        <Section title="10. Limitación de responsabilidad">
          Trive actúa como intermediario tecnológico y no es parte en el acuerdo de transporte entre usuarios. En consecuencia, Trive no es responsable por:{'\n\n'}
          • Accidentes, daños o lesiones ocurridos durante los trayectos.{'\n'}
          • Incumplimientos entre usuarios.{'\n'}
          • Pérdida de objetos durante el trayecto.{'\n'}
          • Cancelaciones de última hora por parte de conductores o pasajeros.{'\n\n'}
          Lo anterior sin perjuicio de los derechos irrenunciables de los consumidores reconocidos en la Ley 1480 de 2011.
        </Section>

        <Section title="11. Propiedad intelectual">
          Todos los derechos sobre la marca Trive, su diseño, código fuente y contenidos de la Plataforma pertenecen a Trive Technologies SAS. Queda prohibida su reproducción, distribución o uso no autorizado.
        </Section>

        <Section title="12. Modificaciones">
          Trive se reserva el derecho de modificar estos Términos en cualquier momento, notificando los cambios a través de la Plataforma con al menos 15 días de anticipación. El uso continuado tras la notificación implica la aceptación de los nuevos términos.
        </Section>

        <Section title="13. Ley aplicable y jurisdicción">
          Estos Términos se rigen por las leyes de la República de Colombia. Cualquier controversia se someterá a la jurisdicción de los jueces competentes de la ciudad de Cali, Colombia, sin perjuicio del derecho a acudir ante la Superintendencia de Industria y Comercio (SIC) como autoridad de protección al consumidor.
        </Section>

        <View style={s.contactBox}>
          <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={s.contactLabel}>Contacto</Text>
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
  date: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    fontStyle: 'italic',
  },

  section: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
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

  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
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
