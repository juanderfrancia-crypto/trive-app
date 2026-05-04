# 📋 Setup: Auto-actualización de Bookings Completados

## Qué hace

Automáticamente cambia el estado de las reservas ("confirmed" → "completed") cuando la fecha/hora de salida de la ruta ya pasó.

**Ventajas:**
- ✅ Se actualiza automáticamente cada 5 minutos en el servidor
- ✅ No requiere que la app esté abierta
- ✅ Los usuarios ven el historial correcto al abrir la app
- ✅ Funciona en tiempo real en Supabase

---

## Pasos para implementar

### Paso 1: Habilitar la extensión pg_cron en Supabase

1. Ve a tu dashboard de **Supabase**
2. Selecciona tu proyecto
3. Ve a **Project Settings** (esquina inferior izquierda)
4. Abre la pestaña **Extensions**
5. Busca **"pg_cron"**
6. Haz clic en **Enable**

⏳ Espera 30-60 segundos a que se habilite.

---

### Paso 2: Ejecutar el script SQL

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Haz clic en **New Query**
3. Copia el contenido del archivo `BOOKING_STATUS_AUTO_UPDATE.sql`
4. Pégalo en el editor
5. Haz clic en **Run** (botón azul)

**Resultado esperado:**
- ✅ Sin errores = funcionando correctamente
- ❌ Error sobre `pg_cron` = vuelve al Paso 1

---

### Paso 3: Verificar que funciona

Ejecuta esta query en SQL Editor para ver los jobs activos:

```sql
SELECT * FROM cron.job;
```

Deberías ver una fila con nombre `update_completed_bookings_job`.

---

## Cómo funciona

| Estado | Cuándo | Dónde aparece |
|--------|--------|--------------|
| `confirmed` | Justo después de reservar | Rutas próximas (ScheduledTrips) |
| `completed` | Después de la hora de salida | Historial (TripHistory) ✅ |
| `cancelled` | Usuario cancela | Historial |

**Ejemplo:**
- Hoy 7 de abril 15:00 → Reservas Padilla-Palmira salida 14:00
- ✅ Auto-actualiza a "completed" en servidor
- Usuario abre app → Ve en "Historial de Viajes"

---

## Personalización

### Cambiar frecuencia de actualización

Por defecto: **cada 5 minutos** (`*/5 * * * *`)

Para **cada 1 minuto** (más en tiempo real):
```sql
SELECT cron.schedule(
  'update_completed_bookings_job',
  '* * * * *',
  'SELECT update_completed_bookings()'
);
```

Para **cada 10 minutos** (menos carga):
```sql
SELECT cron.schedule(
  'update_completed_bookings_job',
  '*/10 * * * *',
  'SELECT update_completed_bookings()'
);
```

---

## Desactivar si es necesario

```sql
SELECT cron.unschedule('update_completed_bookings_job');
```

---

## Solución de problemas

### Error: "pg_cron no existe"
→ Habilita la extensión en Project Settings > Extensions

### Los bookings no se actualizan
→ Verifica que el job está activo:
```sql
SELECT * FROM cron.job WHERE jobname = 'update_completed_bookings_job';
```

### Quiero probar que funciona ahora
→ Ejecuta esta query manualmente:
```sql
SELECT update_completed_bookings();
```

Luego verifica que los bookings pasados ahora son "completed":
```sql
SELECT id, booking_status, route_id FROM bookings 
WHERE booking_status = 'completed' 
ORDER BY created_at DESC LIMIT 5;
```

---

## Resumen

✅ **Implementado:**
- Función SQL que busca rutas pasadas
- Job cron que se ejecuta cada 5 minutos
- Actualización automática de status

✅ **Resultado:**
- Usuarios ven correctamente su historial
- No aparecen rutas pasadas en "Rutas disponibles"
- Sistema de calificaciones funciona perfecto
