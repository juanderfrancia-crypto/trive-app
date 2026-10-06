import { View, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native'
import { Text } from '../components/AppText'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import Icon from '../components/Icon'

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  return (
    <View style={[s.safe, { paddingTop: insets.top }]}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="ChevronLeft" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Términos de Uso</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={s.brandBlock}>
          <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.company}>Trive Technologies SAS</Text>
          <Text style={s.date}>Última actualización: 6 de octubre de 2026</Text>
        </View>

        <Section title="1. Aceptación de los términos">
          Al descargar, instalar o utilizar la aplicación Trive, declaras haber leído, entendido y aceptado estos Términos de Uso en su totalidad. Si no estás de acuerdo con alguno de estos términos, debes abstenerte de utilizar la Plataforma.
        </Section>

        <Section title="2. Naturaleza del servicio">
          Trive Technologies SAS opera exclusivamente como una plataforma tecnológica de intermediación que facilita la conexión entre particulares que deseen compartir un vehículo y los costos de un trayecto.{'\n\n'}
          Trive no es una empresa de transporte público, privado colectivo ni individual, ni presta servicios de taxi o similares. Las rutas publicadas corresponden a viajes que los conductores ya tienen planeado realizar, en los cuales ofrecen puestos disponibles a otros usuarios para compartir gastos de desplazamiento.{'\n\n'}
          Las rutas personalizadas (aeropuerto o particulares) son solicitudes de trayecto publicadas por pasajeros y aceptadas por conductores. Trive no fija el precio de estos trayectos, no participa en su ejecución y no es parte del acuerdo entre pasajero y conductor.
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
          • Ser aprobado por Trive, que verifica la identidad del conductor y el estado de su vehículo antes de habilitarle la publicación. Trive puede retirar esta habilitación si los documentos vencen o si el conductor incumple estos términos.{'\n'}
          • Contar con saldo suficiente en su billetera de Trive antes de publicar. Cada publicación de ruta descuenta automáticamente $2.000 del saldo disponible; si el saldo es insuficiente, la publicación no se procesará.{'\n'}
          • No cobrar un valor superior al de los gastos reales del trayecto (combustible, peajes y desgaste del vehículo). Trive es una plataforma de compartición de gastos, no de lucro por transporte.{'\n\n'}
          <B>Rutas personalizadas:</B> los conductores aprobados pueden aceptar solicitudes de ruta al aeropuerto o particulares publicadas por pasajeros. Al aceptar una solicitud, o una oferta de precio sobre ella, se descuentan automáticamente $5.000 de la billetera del conductor como costo de uso de la Plataforma para esta modalidad. Si el saldo es insuficiente, el conductor no podrá aceptar hasta recargar su billetera. El precio del trayecto lo acuerdan directamente pasajero y conductor.
        </Section>

        <Section title="6. Pasajeros">
          Los usuarios que reserven puestos deben:{'\n\n'}
          • Presentarse puntualmente en el punto de encuentro acordado.{'\n'}
          • Tratar al conductor y demás pasajeros con respeto.{'\n'}
          • Respetar las normas de convivencia durante el trayecto.{'\n'}
          • Reportar cualquier incidente a través de los canales oficiales de Trive.
        </Section>

        <Section title="7. Tarifas y pagos">
          El precio de cada ruta lo fija el conductor y el pago se acuerda y realiza directamente entre conductor y pasajero (efectivo, Nequi, Daviplata u otros). Trive no intermedia ni retiene ese dinero, y no garantiza devoluciones de pagos hechos entre usuarios.{'\n\n'}
          <B>Saldo de la billetera:</B> Trive cobra únicamente los $2.000 por publicar una ruta y los $5.000 por aceptar una ruta personalizada. Ambos se descuentan del saldo del conductor. El saldo se recarga mediante los medios de pago habilitados en la aplicación.{'\n\n'}
          El saldo es de uso exclusivo dentro de Trive. <B>No es retirable, no se transfiere a terceros y no se convierte en dinero en efectivo.</B> Las recargas no son reembolsables. Esta regla aplica también si la cuenta se cierra: el saldo que quede se pierde al cierre, salvo los casos de error de la aplicación descritos en la sección 8.{'\n\n'}
          <B>Referidos:</B> cuando un conductor nuevo se registra con el código de otro conductor y completa y confirma su primera reserva, el conductor que refirió recibe $2.000 de crédito en su saldo y el conductor nuevo recibe $1.000 de crédito. Este beneficio aplica una sola vez por conductor nuevo y se otorga solo si Trive confirma la reserva.
        </Section>

        <Section title="8. Cancelaciones y reembolsos">
          <B>Publicación de ruta ($2.000):</B>{'\n'}
          • Se devuelven automáticamente al saldo si el conductor cancela antes de pulsar "Salir" y la ruta no tiene reservas confirmadas. Máximo tres devoluciones automáticas por conductor al día.{'\n'}
          • No se devuelven si hay reservas confirmadas, si el conductor pulsa "Salir", o si pasa la hora de salida sin que el conductor pulse "Salir". En ese caso la ruta se cierra y los pasajeros reservados son avisados.{'\n'}
          • Se devuelven si hubo un error de la aplicación, como un cobro duplicado.{'\n\n'}
          <B>Ruta personalizada aceptada ($5.000):</B>{'\n'}
          • Si el pasajero cancela antes del inicio del viaje, los $5.000 se devuelven al saldo del conductor.{'\n'}
          • Si el conductor cancela, o el viaje se realiza, no hay devolución.{'\n'}
          • Si hubo un error de la aplicación, se devuelve el monto cobrado.{'\n\n'}
          En casos de emergencia documentada, Trive puede revisar y aprobar una devolución adicional, dejando constancia del motivo.{'\n\n'}
          Conductores y pasajeros pueden cancelar antes del inicio del trayecto. Trive puede limitar o suspender el uso de la Plataforma por cancelaciones reiteradas. Estas reglas no limitan los derechos reconocidos a los consumidores por la Ley 1480 de 2011.
        </Section>

        <Section title="8A. Cierre de cuenta">
          Puedes cerrar tu cuenta desde Configuración, en Seguridad y privacidad. Al cerrarla, tus datos personales se eliminan o anonimizan, tus reservas y rutas pendientes se cancelan y el acceso queda bloqueado. Los registros de movimientos del saldo se conservan por obligación legal y contable, sin datos personales. El saldo que tengas al cerrar la cuenta no se devuelve, por lo que te recomendamos usarlo antes de cerrarla.
        </Section>

        <Section title="9. Conducta prohibida">
          Está terminantemente prohibido:{'\n\n'}
          • Utilizar la Plataforma para ofrecer servicio de taxi o de transporte público, o para ofrecer trayectos de forma habitual como actividad de transporte.{'\n'}
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
          • Cancelaciones de última hora por parte de conductores o pasajeros.{'\n'}
          • Acuerdos de recogida, precio, pago o cualquier otro arreglo hecho fuera de la Plataforma. Trive no controla lo que ocurre fuera de la aplicación y no garantiza la ocupación de los vehículos.{'\n\n'}
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
          <Icon name="Mail" size={18} color={COLORS.primary} />
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
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: '800' },

  brandBlock: { alignItems: 'center', marginTop: SPACING.sm, marginBottom: SPACING.xl },
  logo: { width: 160, height: 72 },
  company: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  date: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },

  section: {
    ...SHADOWS.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.primary,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },

  contactBox: {
    ...SHADOWS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primaryTint,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  contactLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  contactValue: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.primary,
  },
})
