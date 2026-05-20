# Viajes de Aeropuerto y Viajes Privados

## Resumen

Feature nueva que permite a pasajeros publicar solicitudes de viaje al aeropuerto con fecha, hora y precio propuesto. Los conductores verificados ven un feed de solicitudes y aceptan las que les convengan. Al aceptar, se descuentan $5.000 del balance del conductor.

**Principio clave:** El pasajero inicia el flujo porque es quien tiene la restricción de tiempo (su vuelo). El conductor responde.

---

## Modelo de negocio

| Tipo de viaje | Comisión | Cuándo se cobra |
|---|---|---|
| Ruta compartida (hoy) | $2.000 | Al publicar la ruta |
| Viaje de aeropuerto (nuevo) | $5.000 | Cuando el conductor acepta la solicitud |

La comisión del aeropuerto se cobra al aceptar (no al publicar) para que el conductor no pierda plata si ningún pasajero coincide.

---

## Flujo del pasajero

1. En el Home ve una sección destacada "¿Necesitas ir al aeropuerto?"
2. Toca y abre la pantalla de nueva solicitud
3. Llena los campos:
   - Ciudad / municipio de origen
   - Aeropuerto destino
   - Fecha y hora de salida deseada
   - Número de personas
   - Precio que ofrece (la app muestra rango de referencia)
4. Publica la solicitud
5. Espera — recibe notificación push cuando un conductor acepta
6. Ve el perfil del conductor que aceptó (nombre, foto, calificación, vehículo)
7. Puede chatear con el conductor para coordinar punto exacto de recogida
8. El día del viaje el conductor lo recoge

**Estados de la solicitud para el pasajero:**
- `pending` — publicada, esperando conductor
- `accepted` — un conductor aceptó
- `completed` — viaje realizado
- `cancelled` — cancelada por el pasajero

---

## Flujo del conductor

1. En su Home ve una sección "Solicitudes de aeropuerto"
2. Ve tarjetas con: origen, destino, fecha/hora, personas, precio ofrecido
3. Toca una solicitud para ver detalles completos
4. Si le conviene, toca "Aceptar viaje"
5. Se le descuentan $5.000 del balance automáticamente
6. Le llega al pasajero la notificación de confirmación
7. Puede chatear con el pasajero para coordinar
8. El día del viaje recoge al pasajero

**Quién puede ver el feed:** Solo usuarios con `role === 'driver'` — no hay lógica adicional de verificación porque el proceso de onboarding ya garantiza que todos los conductores están verificados.

---

## Base de datos — cambios necesarios

### Nueva tabla: `airport_requests`

```sql
CREATE TABLE airport_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id       UUID REFERENCES profiles(id),           -- null hasta que alguien acepte
  origin          TEXT NOT NULL,
  destination     TEXT NOT NULL DEFAULT 'Aeropuerto',
  departure_time  TIMESTAMPTZ NOT NULL,
  passengers      INT NOT NULL DEFAULT 1,
  offered_price   INT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','completed','cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  accepted_at     TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ
);
```

### RLS policies

```sql
-- Pasajero ve sus propias solicitudes
-- Conductor ve todas las solicitudes pending
-- Nadie más ve nada
```

### Sin cambios a tablas existentes

La tabla `routes` no se toca. El sistema de aeropuerto es completamente independiente para no romper nada del flujo actual.

---

## Archivos a crear (nuevos)

| Archivo | Descripción |
|---|---|
| `src/screens/AirportRequestScreen.tsx` | Formulario del pasajero para publicar solicitud |
| `src/screens/AirportFeedScreen.tsx` | Feed de solicitudes para conductores |
| `src/hooks/useAirportRequests.ts` | Hook con toda la lógica de datos |
| `supabase/migrations/20260520_airport_requests.sql` | Migración de la tabla |

## Archivos a modificar (existentes — cambios mínimos)

| Archivo | Qué se agrega | Riesgo |
|---|---|---|
| `src/screens/HomeScreen.tsx` | Banner "¿Necesitas ir al aeropuerto?" para pasajero + sección "Solicitudes" para conductor | Bajo — solo se agrega JSX condicional |
| `src/navigation/AppNavigator.tsx` | Registrar las 2 pantallas nuevas | Bajo |

---

## Rango de precios de referencia

La app muestra al pasajero un rango orientativo para que no publique precios irreales.

| Trayecto | Rango sugerido |
|---|---|
| Municipios Valle del Cauca → Aeropuerto Cali | $60.000 – $120.000 |
| Cali centro → Aeropuerto Cali | $30.000 – $60.000 |
| Otros | Calculado por distancia (por implementar) |

Para la Fase 1 se muestran rangos fijos. En el futuro se puede calcular por la distancia origen–aeropuerto.

---

## Notificaciones

| Evento | Quién recibe | Mensaje |
|---|---|---|
| Conductor acepta solicitud | Pasajero | "¡Tienes conductor! [Nombre] aceptó tu viaje al aeropuerto" |
| Nueva solicitud publicada | Todos los conductores (broadcast) | "Nueva solicitud de aeropuerto cerca de tu zona" |
| Pasajero cancela | Conductor (si ya aceptó) | "El pasajero canceló el viaje al aeropuerto" |

---

## Lo que NO se construye en esta versión

- ❌ Contraofertas o negociación de precio
- ❌ Viajes privados que no sean aeropuerto
- ❌ Cálculo de precio por distancia automático
- ❌ Penalización por cancelación tardía
- ❌ Múltiples conductores respondiendo a la misma solicitud

Todo esto queda para Fase 2 una vez validada la demanda.

---

## Plan de implementación (orden)

1. Migración SQL — tabla `airport_requests` + RLS
2. Hook `useAirportRequests` — lógica de crear, leer, aceptar, cancelar
3. Pantalla `AirportRequestScreen` — formulario del pasajero
4. Pantalla `AirportFeedScreen` — feed del conductor
5. Modificar `HomeScreen` — agregar entrada para cada rol
6. Registrar rutas en `AppNavigator`
7. Notificaciones push al aceptar

---

## Cómo revertir

Como la tabla `airport_requests` es completamente nueva y no modifica ninguna tabla existente, revertir es:

```sql
DROP TABLE IF EXISTS airport_requests CASCADE;
```

Y eliminar los 4 archivos nuevos. Las pantallas existentes no se rompen.
