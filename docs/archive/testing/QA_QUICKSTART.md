# 🎯 QA TESTING QUICKSTART - PARA EMPEZAR AHORA

## 🚀 EMPEZAR EN 2 MINUTOS

### PASO 1: Abre Supabase SQL Editor
```
https://app.supabase.com → Tu Proyecto → SQL Editor
```

### PASO 2: Copia y ejecuta setup
**Archivo:** `QA_01_SETUP_TEST_DATA.sql`

**Resultado:** 3 usuarios + 2 rutas creadas ✅

---

## 📋 DOCUMENTOS DE TESTING CREADOS

| Documento | Propósito | Cuándo Usarlo |
|-----------|-----------|---------------|
| **QA_TESTING_MASTER_GUIDE.md** | Guía completa paso a paso | 👈 **LEER ESTO PRIMERO** |
| **QA_01_SETUP_TEST_DATA.sql** | Crear datos de prueba en BD | Ejecutar en Supabase |
| **QA_02_VERIFY_ROUTES_CREATED.sql** | Verificar rutas creadas | Después de crear rutas |
| **QA_03_VERIFY_BOOKINGS.sql** | Verificar reservas | Después de reservar |
| **QA_04_VERIFY_REALTIME.sql** | Verificar actualización real-time | Después de múltiples reservas |
| **QA_05_COMPLETE_DASHBOARD.sql** | Dashboard completo del sistema | Verificación final |

---

## 🎬 FLUJO RÁPIDO DE TESTING (45 min)

```
⏱️ 0:00  → Ejecuta QA_01_SETUP_TEST_DATA.sql
⏱️ 0:05  → Login Conductor, crea 2 rutas en app
⏱️ 0:10  → Ejecuta QA_02_VERIFY_ROUTES_CREATED.sql
⏱️ 0:15  → Login Pasajero 1, reserva 2 asientos
⏱️ 0:20  → Ejecuta QA_03_VERIFY_BOOKINGS.sql
⏱️ 0:25  → Login Pasajero 2, reserva 1 asiento
⏱️ 0:30  → Ejecuta QA_04_VERIFY_REALTIME.sql
⏱️ 0:35  → Pasajero 1 cancela, verifica liberación
⏱️ 0:40  → Conductor inicia viaje
⏱️ 0:45  → Ejecuta QA_05_COMPLETE_DASHBOARD.sql
✅ TESTING COMPLETO
```

---

## 🧠 QUÉ VERIFICAR (CHECKLIST SIMPLE)

### Durante el testing, busca estos indicadores ✅/❌:

**APP (UI/UX):**
- [ ] Sin congelaciones
- [ ] Transiciones suaves
- [ ] Asientos muestran colores (verde/rojo)
- [ ] Contadores actualizan
- [ ] Confirmaciones claras

**TIEMPO REAL:**
- [ ] Cambios visibles <5 segundos
- [ ] Consistencia entre usuarios
- [ ] Sin datos desincronizados

**BASE DE DATOS:**
- [ ] Datos creados correctamente
- [ ] Available_seats se recalcula
- [ ] Bookings con status correcto
- [ ] Sin errores RLS

---

## 📞 SI ALGO FALLA

### Problema: "No veo cambios en tiempo real"
```
→ Espera 5 segundos (polling)
→ Refresca pantalla (pull down)
→ Cierra y abre la app
```

### Problema: "Se congela al confirmar"
```
→ Abre DevTools (Press 'j' en Expo)
→ Busca errores en consola
→ Verifica que BD crea el booking
→ Check RLS policies
```

### Problema: "Asientos no se actualizan correctamente"
```
→ Ejecuta QA_05_COMPLETE_DASHBOARD.sql
→ Revisa sección "CONSISTENCIA"
→ Verifica que available_seats = total - occupied
```

---

## ✅ CRITERIOS DE ACEPTACIÓN PARA PRODUCCIÓN

**TODO debe estar ✅:**

```
✅ 0 Congelaciones
✅ Actualización realtime (<5s)
✅ Consistencia de datos
✅ Sin errores RLS
✅ Sin errores de red
✅ Todos los bookings creados
✅ Asientos mostrados correctamente
✅ Pasajero ve cambios
✅ Conductor ve pasajeros
✅ Cancelación funciona
✅ Iniciar viaje funciona
✅ Ruta completa sin errores
```

---

## 🚀 CUANDO ESTÉ READY PARA PRODUCCIÓN

```bash
# Limpiar datos de prueba
DELETE FROM bookings WHERE passenger_id LIKE '%test%';
DELETE FROM routes WHERE driver_id LIKE '%test%';
DELETE FROM profiles WHERE email LIKE '%test.com%';

# Build para producción
eas build -p android --profile production
eas build -p ios --profile production

# Publicar en tiendas
→ Google Play Console (Android APK)
→ App Store Connect (iOS IPA)
```

---

## 📊 REPORTE FINAL

Después de completar todos los tests, ejecuta:

```sql
-- Copia QA_05_COMPLETE_DASHBOARD.sql
-- Este genera el reporte completo
```

**Deberías ver:**
- ✅ 2 Rutas creadas
- ✅ 3 Bookings confirmados
- ✅ 100% Consistencia de datos
- ✅ 0 Errores
- ✅ Revenue tracked

---

## 🎯 SIGUIENTE PASO

👉 **Lee:** `QA_TESTING_MASTER_GUIDE.md` (guía completa)

👉 **O comienza ahora:** Abre Supabase y ejecuta `QA_01_SETUP_TEST_DATA.sql`

---

## 📝 NOTAS

- Todos los scripts son IDEMPOTENTES (puedes correrlos múltiples veces)
- Los datos de prueba son aislados (no interfieren con usuarios reales)
- Los IDs son predeterminados para consistencia
- Si falla algo, revisa Supabase Logs

---

**¡Estoy listo como QA Senior para dirigir estas pruebas! 💪**

**¿Ejecutamos el testing ahora? ¡Pásame la señal! 🚀**