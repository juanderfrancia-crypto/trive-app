const DIA_MS = 24 * 60 * 60 * 1000

const inicioDelDia = (fecha: Date) => {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  return d
}

// "Hoy", "Ayer", "Mañana" o el nombre del día (con fecha si está lejos).
export const formatDia = (iso: string): string => {
  const fecha = new Date(iso)
  const diferencia = Math.round((inicioDelDia(fecha).getTime() - inicioDelDia(new Date()).getTime()) / DIA_MS)
  if (diferencia === 0) return 'Hoy'
  if (diferencia === -1) return 'Ayer'
  if (diferencia === 1) return 'Mañana'
  if (Math.abs(diferencia) > 6) {
    return fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })
  }
  const nombre = fecha.toLocaleDateString('es-CO', { weekday: 'long' })
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}

// Hora en formato 12 h: { hora: "2:30", periodo: "p. m." }
export const formatHoraPartes = (iso: string): { hora: string; periodo: string } => {
  const fecha = new Date(iso)
  const h24 = fecha.getHours()
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return {
    hora: `${h12}:${String(fecha.getMinutes()).padStart(2, '0')}`,
    periodo: h24 < 12 ? 'a. m.' : 'p. m.',
  }
}

export const formatHora = (iso: string): string => {
  const { hora, periodo } = formatHoraPartes(iso)
  return `${hora} ${periodo}`
}

export const formatPrecio = (valor: number): string =>
  `$${(valor ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
