// Las columnas de auditoría (created_at, updated_at, cancelled_at, read_at,
// verified_at, last_seen, driver_verified_at, etc.) se guardan en la base como
// `timestamp` SIN zona horaria, pero siempre con NOW() de Postgres -- es decir,
// el valor ya está en UTC, solo que el string que llega del servidor no lo dice
// ("2026-11-20T04:44:19", sin la "Z" del final). Sin esa "Z", `new Date(...)`
// lo interpreta como si ya fuera la hora local del teléfono, adelantándolo
// ~5 horas en Colombia -- es el bug real detrás de horas como "4:44 a.m."
// cuando en Bogotá apenas eran las 2 de la madrugada.
//
// OJO: esto NO aplica a `departure_time`/`arrival_time` de las rutas -- esos
// se guardan a propósito como hora de Bogotá sin zona (ver toLocalISO en
// PublishRouteFlow.tsx), así que esos siguen usando `new Date(...)` normal,
// nunca esta función.
export function parseServerDate(value: string | null | undefined): Date {
  if (!value) return new Date(0)
  const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)
  return new Date(hasTimezone ? value : `${value}Z`)
}
