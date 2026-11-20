const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

export const formatPrice = (value: number) => `$${value.toLocaleString('es-CO')}`

export const formatDeparture = (iso: string): string => {
  const d = new Date(iso)
  const dayDiff = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000)
  const weekday = d.toLocaleDateString('es-CO', { weekday: 'long' })
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  const dateLabel = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  const dayLabel =
    dayDiff === 0 ? 'Hoy' : dayDiff === 1 ? 'Mañana' : `${weekdayCap} ${dateLabel}`
  const time = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
  return `${dayLabel} · ${time}`
}
