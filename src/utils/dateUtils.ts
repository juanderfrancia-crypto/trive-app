const BOGOTA_TIMEZONE = 'America/Bogota'

const hasTimezoneOffset = (timestamp: string): boolean => {
  return /Z$|[+-]\d{2}:\d{2}$/.test(timestamp.trim())
}

const normalizeUtcTimestamp = (timestamp: string): string => {
  const trimmed = timestamp?.trim() || ''
  if (!trimmed) return trimmed

  if (hasTimezoneOffset(trimmed)) {
    return trimmed
  }

  const isoLike = trimmed.replace(' ', 'T')
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(isoLike)) {
    return `${isoLike}Z`
  }

  return trimmed
}

export const parseTimestamp = (timestamp: string): Date => {
  const normalized = normalizeUtcTimestamp(timestamp)
  const date = new Date(normalized)
  if (!isNaN(date.getTime())) {
    return date
  }

  return new Date(timestamp)
}

export const getUtcDateKey = (timestamp: string): string => {
  const date = parseTimestamp(timestamp)
  if (isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

export const formatBogotaTime = (timestamp: string): string => {
  const date = parseTimestamp(timestamp)
  if (isNaN(date.getTime())) return ''

  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: BOGOTA_TIMEZONE,
  })
}

export const formatBogotaDateLabel = (timestamp: string): string => {
  const date = parseTimestamp(timestamp)
  if (isNaN(date.getTime())) return ''

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayKey = today.toLocaleDateString('en-CA', { timeZone: BOGOTA_TIMEZONE })
  const yesterdayKey = yesterday.toLocaleDateString('en-CA', { timeZone: BOGOTA_TIMEZONE })
  const messageKey = date.toLocaleDateString('en-CA', { timeZone: BOGOTA_TIMEZONE })

  if (messageKey === todayKey) return 'Hoy'
  if (messageKey === yesterdayKey) return 'Ayer'

  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: BOGOTA_TIMEZONE,
  })
}

export const formatConversationTime = (timestamp: string): string => {
  const date = parseTimestamp(timestamp)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffTime / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'Ahora'
  if (diffMinutes < 60) return `Hace ${diffMinutes}m`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) {
    return date.toLocaleDateString('es-CO', {
      weekday: 'short',
      timeZone: BOGOTA_TIMEZONE,
    })
  }

  return date.toLocaleDateString('es-CO', {
    month: 'short',
    day: 'numeric',
    timeZone: BOGOTA_TIMEZONE,
  })
}
