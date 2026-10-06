import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Text } from '../../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../components/Icon'
import { useNavigation } from '@react-navigation/native'
import { COLORS, RADIUS, SPACING } from '../../theme/theme'
import Illustration from '../../components/illustrations/Illustration'
import { useAppStore } from '../../store/useAppStore'
import { formatDia, formatHora, formatPrecio } from '../passenger/passengerFormat'
import { PendingPayment, useDriverPayments } from './useDriverPayments'

const tiempoTranscurrido = (iso: string): string => {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutos < 1) return 'hace un momento'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  return `${formatDia(iso)} ${formatHora(iso)}`
}

export default function DriverPaymentsScreen() {
  const navigation = useNavigation()
  const user = useAppStore((s) => s.user)
  const { payments, loading, busyCode, feedback, confirm, reload } = useDriverPayments(user?.id)

  const responder = (pago: PendingPayment, recibido: boolean) => {
    confirm(pago.reservationCode, recibido)
  }

  const renderTarjeta = (pago: PendingPayment) => {
    const marcado = !!pago.markedAt
    const ocupado = busyCode === pago.reservationCode
    return (
      <View key={pago.reservationCode} style={[styles.tarjeta, marcado && styles.tarjetaMarcada]}>
        <View style={styles.filaSuperior}>
          <View style={[styles.chip, marcado ? styles.chipMarcado : styles.chipPendiente]}>
            <Text style={[styles.chipTexto, marcado ? styles.chipTextoMarcado : styles.chipTextoPendiente]}>
              {marcado ? 'Marcado como pagado' : 'Pendiente de pago'}
            </Text>
          </View>
          <Text style={styles.tiempo}>
            {marcado ? tiempoTranscurrido(pago.markedAt as string) : `${formatDia(pago.departureTime)} ${formatHora(pago.departureTime)}`}
          </Text>
        </View>

        <Text style={styles.pasajero}>
          {pago.passengerName} · {pago.seats} {pago.seats === 1 ? 'asiento' : 'asientos'}
        </Text>
        <Text style={styles.detalle}>
          Código <Text style={styles.codigo}>{pago.reservationCode}</Text>
        </Text>
        <Text style={styles.ruta} numberOfLines={1}>
          {pago.origin} → {pago.destination}
        </Text>

        <View style={styles.filaMonto}>
          <Text style={styles.montoEtiqueta}>Monto</Text>
          <Text style={styles.monto}>{formatPrecio(pago.total)}</Text>
        </View>

        {!marcado && (
          <Text style={styles.notaTexto}>
            El pasajero aún no marca que pagó. Cuando lo haga, aquí podrás confirmar si recibiste el dinero.
          </Text>
        )}

        {marcado ? (
          <View style={styles.acciones}>
            <TouchableOpacity
              onPress={() => responder(pago, true)}
              disabled={ocupado}
              style={[styles.botonPrimario, ocupado && styles.botonInactivo]}
              accessibilityRole="button"
            >
              {ocupado ? (
                <ActivityIndicator color={COLORS.textInverse} />
              ) : (
                <Text style={styles.botonPrimarioTexto}>Recibí el pago</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => responder(pago, false)}
              disabled={ocupado}
              style={styles.botonSecundario}
              accessibilityRole="button"
            >
              <Text style={styles.botonSecundarioTexto}>No lo recibí</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Volver">
          <Icon name="ArrowLeft" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.contenido}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={COLORS.primary} />}
      >
        <Text style={styles.titulo}>Pagos por confirmar</Text>
        <Text style={styles.subtitulo}>Confirma cuando recibas el dinero en tu Nequi, Daviplata o banco.</Text>

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        {!loading && payments.length === 0 ? (
          <View style={styles.vacio}>
            <Illustration name="savingMoney" width={160} />
            <Text style={styles.vacioTitulo}>No tienes pagos por confirmar</Text>
            <Text style={styles.subtitulo}>Aquí aparecerán las reservas de tus viajes con pago pendiente.</Text>
          </View>
        ) : (
          payments.map(renderTarjeta)
        )}

        <View style={styles.nota}>
          <Text style={styles.notaTexto}>Tu confirmación queda registrada. Trive no mueve ni retiene este dinero.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  contenido: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxl },
  titulo: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  subtitulo: { marginTop: SPACING.xs, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  feedback: { marginTop: SPACING.md, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  tarjeta: {
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    padding: SPACING.lg,
  },
  tarjetaMarcada: { borderColor: COLORS.primary },
  filaSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { paddingHorizontal: SPACING.md - 2, paddingVertical: SPACING.xs + 1, borderRadius: RADIUS.full },
  chipMarcado: { backgroundColor: COLORS.warningLight },
  chipPendiente: { backgroundColor: COLORS.surfaceAlt },
  chipTexto: { fontSize: 13, fontWeight: '700' },
  chipTextoMarcado: { color: COLORS.warningDark },
  chipTextoPendiente: { color: COLORS.textSecondary },
  tiempo: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  pasajero: { marginTop: SPACING.md, fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  detalle: { marginTop: SPACING.xs, fontSize: 14, color: COLORS.textSecondary },
  codigo: { fontWeight: '800', color: COLORS.textPrimary },
  ruta: { marginTop: SPACING.xs, fontSize: 13, color: COLORS.textSecondary },
  filaMonto: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  montoEtiqueta: { fontSize: 13, color: COLORS.textSecondary },
  monto: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  acciones: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  botonPrimario: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonInactivo: { backgroundColor: COLORS.grayLight },
  botonPrimarioTexto: { fontSize: 14, fontWeight: '800', color: COLORS.textInverse },
  botonSecundario: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonSecundarioTexto: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  vacio: { marginTop: SPACING.xxl, alignItems: 'center' },
  vacioTitulo: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  nota: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceAlt,
  },
  notaTexto: { fontSize: 13, color: COLORS.secondary, lineHeight: 20 },
})
