import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Clipboard, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Text } from '../../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../components/Icon'
import { useNavigation, useRoute } from '@react-navigation/native'
import { COLORS, RADIUS, SPACING } from '../../theme/theme'
import Illustration from '../../components/illustrations/Illustration'
import { useAppStore } from '../../store/useAppStore'
import { formatDia, formatHora, formatPrecio } from '../passenger/passengerFormat'
import { usePassengerPayment } from './usePassengerPayment'

interface PassengerPaymentParams {
  reservationCode: string
}

const SIN_LLAVE = 'El conductor aún no registró su llave'

export default function PassengerPaymentScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { reservationCode } = (route.params ?? {}) as Partial<PassengerPaymentParams>
  const user = useAppStore((s) => s.user)
  const { summary, breBKey, loading, marking, message, markPaid } = usePassengerPayment(reservationCode ?? '', user?.id)

  const [copiado, setCopiado] = useState(false)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current)
  }, [])

  const copiarLlave = () => {
    if (!breBKey) return
    Clipboard.setString(breBKey)
    setCopiado(true)
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setCopiado(false), 2000)
  }

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Volver">
        <Icon name="ArrowLeft" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
    </View>
  )

  if (loading && !summary) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {header}
        <View style={styles.centrado}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!summary) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {header}
        <View style={styles.centrado}>
          <Text style={styles.titulo}>No encontramos esta reserva</Text>
          <Text style={styles.subtitulo}>Revisa el código o vuelve a tus viajes.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const pagoConfirmado = !!summary.confirmedAt
  const pagoInformado = !!summary.markedAt
  const enEfectivo = summary.paymentMethod === 'cash'
  const botonDeshabilitado = marking || pagoInformado || pagoConfirmado
  const etiquetaBoton = pagoConfirmado ? 'Pago confirmado' : pagoInformado ? 'Pago informado' : 'Ya pagué'

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {header}
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={{ alignItems: 'center' }}>
          <Illustration name="walletDiag" width={180} />
        </View>
        <Text style={styles.etiqueta}>
          {pagoConfirmado ? 'Pago confirmado' : 'Reserva confirmada · pago pendiente'}
        </Text>
        <Text style={styles.titulo}>Paga a {summary.driverName}</Text>
        <Text style={styles.subtitulo}>Trive no recibe este pago. Lo haces directo a {summary.driverName}.</Text>

        <View style={styles.tarjetaTotal}>
          <Text style={styles.totalEtiqueta}>Total de tu reserva</Text>
          <Text style={styles.totalMonto}>{formatPrecio(summary.total)}</Text>
          <Text style={styles.totalDetalle}>
            {summary.seats} {summary.seats === 1 ? 'asiento' : 'asientos'} · {formatDia(summary.departureTime)} {formatHora(summary.departureTime)}
          </Text>
        </View>

        {enEfectivo ? (
          <View style={styles.bloque}>
            <Text style={styles.subtitulo}>Esta reserva se paga en efectivo al conductor.</Text>
          </View>
        ) : (
          <>
            <View style={styles.bloque}>
              <Text style={styles.seccion}>Llave Bre-B de {summary.driverName}</Text>
              {breBKey ? (
                <View style={styles.filaLlave}>
                  <Text style={styles.llave} selectable>{breBKey}</Text>
                  <TouchableOpacity onPress={copiarLlave} style={styles.botonCopiar} accessibilityLabel="Copiar llave">
                    <Text style={styles.botonCopiarTexto}>{copiado ? 'Copiado' : 'Copiar'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.vacio}>{SIN_LLAVE}</Text>
              )}
              <Text style={styles.ayuda}>Funciona en Nequi, Daviplata y tu banco.</Text>
            </View>

            <View style={[styles.bloque, styles.filaQr]}>
              <View style={styles.cajaQr}>
                <Icon name="QrCode" size={40} color={COLORS.textSecondary} />
              </View>
              <View style={styles.flexUno}>
                <Text style={styles.seccion}>Código QR</Text>
                <Text style={styles.vacio}>{SIN_LLAVE}</Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.tarjetaCodigo}>
          <Text style={styles.codigoEtiqueta}>Código de tu reserva</Text>
          <View style={styles.filaCodigo}>
            <Text style={styles.codigo} selectable>{summary.reservationCode}</Text>
            <Text style={styles.codigoAyuda}>Escríbelo en el concepto</Text>
          </View>
        </View>

        {message ? <Text style={styles.mensaje}>{message}</Text> : null}
      </ScrollView>

      <View style={styles.pie}>
        <TouchableOpacity
          onPress={() => { markPaid() }}
          disabled={botonDeshabilitado}
          style={[styles.botonPrincipal, botonDeshabilitado && styles.botonInactivo]}
          accessibilityRole="button"
        >
          {marking ? (
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <Text style={styles.botonPrincipalTexto}>{etiquetaBoton}</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.pieAyuda}>
          {pagoConfirmado
            ? `${summary.driverName} confirmó que recibió el pago.`
            : `${summary.driverName} confirma cuando recibe el pago.`}
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  contenido: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg },
  etiqueta: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  titulo: { marginTop: SPACING.sm, fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  subtitulo: { marginTop: SPACING.xs, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  tarjetaTotal: {
    marginTop: SPACING.lg,
    borderRadius: 22,
    padding: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  totalEtiqueta: { fontSize: 13, fontWeight: '600', color: COLORS.textInverse, opacity: 0.85 },
  totalMonto: { marginTop: 2, fontSize: 30, fontWeight: '800', color: COLORS.textInverse },
  totalDetalle: { marginTop: SPACING.xs, fontSize: 13, color: COLORS.textInverse, opacity: 0.9 },
  bloque: {
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  seccion: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  filaLlave: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm, gap: SPACING.sm },
  llave: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  botonCopiar: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, backgroundColor: COLORS.primaryTint },
  botonCopiarTexto: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  vacio: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  ayuda: { marginTop: SPACING.xs, fontSize: 12, color: COLORS.textSecondary },
  filaQr: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  cajaQr: {
    width: 92,
    height: 92,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexUno: { flex: 1 },
  tarjetaCodigo: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.primaryTint,
  },
  codigoEtiqueta: { fontSize: 12, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  filaCodigo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xs },
  codigo: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 1 },
  codigoAyuda: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  mensaje: { marginTop: SPACING.lg, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  pie: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  botonPrincipal: {
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonInactivo: { backgroundColor: COLORS.grayLight },
  botonPrincipalTexto: { fontSize: 16, fontWeight: '700', color: COLORS.textInverse },
  pieAyuda: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
})
