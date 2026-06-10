## 🔒 Fix: Recursión Infinita en Solicitudes de Pasajeros

### ❌ Problema Reportado
Cuando estás en modo conductor viendo solicitudes de pasajeros (aeropuerto y otros viajes), no puedes:
- ✗ Aceptar solicitudes
- ✗ Enviar contraofertas
- ✗ Aparece error: **"infinite recursion detected in policy"**

### 🔍 Causa Raíz
La tabla `airport_offers` tiene una política RLS (`driver_create_offer`) que intenta hacer una consulta `NOT EXISTS` en la misma tabla `airport_offers`:

```sql
-- ❌ PROBLEMA (línea problemática):
CREATE POLICY "driver_create_offer"
  ON airport_offers
  FOR INSERT
  WITH CHECK (
    driver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM airport_requests WHERE id = request_id AND status = 'pending'
    )
    AND NOT EXISTS (
      SELECT 1 FROM airport_offers  -- ⚠️ Consulta la MISMA tabla
      WHERE request_id = airport_offers.request_id
      AND driver_id = auth.uid()
      AND status IN ('pending', 'accepted')
    )  -- ⚠️ Esto dispara la política nuevamente → RECURSIÓN INFINITA
  );
```

Cuando PostgreSQL intenta aplicar la política:
1. Usuario intenta insertar oferta
2. PostgreSQL ejecuta la política para validar
3. La política hace `NOT EXISTS` en `airport_offers`
4. Esto dispara la política nuevamente
5. La política vuelve a hacer `NOT EXISTS` ...
6. **RECURSIÓN INFINITA** 🔄

### ✅ Solución
Mover la validación de "una oferta por conductor" desde la **política RLS** a un **TRIGGER**:

**¿Por qué funciona?**
- Los triggers **NO disparan políticas RLS**
- No hay recursión, solo ejecución directa
- La validación de negocio sigue siendo segura
- El usuario obtiene el mismo error si intenta duplicar

### 📋 Pasos para Aplicar el Fix

#### 1️⃣ Ejecutar el Script de Fix
Abre Supabase → SQL Editor y ejecuta:

```sql
-- [Copiar el contenido completo de FIX_AIRPORT_RECURSION.sql]
```

**Ubicación del archivo:**
`database/policies/FIX_AIRPORT_RECURSION.sql`

#### 2️⃣ Verificar que se aplicó correctamente

En Supabase SQL Editor, ejecuta:

```sql
-- Ver todas las políticas de airport_offers
SELECT policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'airport_offers' 
ORDER BY policyname;
```

**Esperado:**
- ✅ `driver_accept_request` (UPDATE)
- ✅ `driver_create_offer_simple` (INSERT) ← **NUEVA**
- ✅ `driver_reject_own_offer` (UPDATE)
- ✅ `driver_view_own_offers` (SELECT)
- ✅ `passenger_accept_offer` (UPDATE)
- ✅ `passenger_view_offers` (SELECT)

#### 3️⃣ Verificar que el Trigger existe

```sql
-- Ver triggers en airport_offers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'airport_offers';
```

**Esperado:**
- ✅ `validate_offer_uniqueness` → `BEFORE INSERT OR UPDATE`

### 🧪 Prueba de Funcionamiento

Después de aplicar el fix:

1. **Como conductor**, abre la pantalla de solicitudes
2. **Intenta crear una oferta** en una solicitud de pasajero
3. **Resultado esperado:**
   - ✅ La oferta se crea sin errores
   - ✅ Puedes aceptarla o rechazarla
   - ✅ Si intentas crear una segunda, aparece: "Ya tienes una oferta pendiente para esta solicitud"

### 📊 Comparación Antes/Después

| Acción | Antes (❌ Error) | Después (✅ Funciona) |
|--------|---|---|
| Ver solicitudes | ✅ Funciona | ✅ Funciona |
| Crear oferta | ❌ infinite recursion | ✅ Se crea |
| Aceptar oferta | ❌ infinite recursion | ✅ Se acepta |
| Enviar contraoferta | ❌ infinite recursion | ✅ Se envía |
| Crear 2ª oferta (misma solicitud) | ❌ infinite recursion | ✅ Error: "Ya tienes oferta" |

### 🔒 Seguridad

El fix es **igual de seguro** porque:
- ✅ El TRIGGER sigue siendo `SECURITY DEFINER` (ejecuta con permisos de owner)
- ✅ La política RLS ahora es más simple y fácil de auditar
- ✅ Las validaciones de negocio se mantienen idénticas
- ✅ No se puede bypassear (el TRIGGER siempre se ejecuta)

### 📚 Información Técnica

**Archivos modificados:**
- `database/policies/FIX_AIRPORT_RECURSION.sql` (NUEVO)

**Cambios en la BD:**
- ❌ Elimina: Política `driver_create_offer` (problemática)
- ✅ Crea: Política `driver_create_offer_simple` (simple)
- ✅ Actualiza: Función `validate_single_offer_per_driver()` (trigger)

**Sin cambios:**
- Las otras 5 políticas de `airport_offers` siguen igual
- Las políticas de `airport_requests` siguen igual
- Las tablas no se modifican, solo las políticas

### ❓ Preguntas Frecuentes

**P: ¿Perderé datos?**
R: No, el fix solo modifica políticas RLS, no toca datos.

**P: ¿Afecta a pasajeros?**
R: No, solo modifica cómo se valida la creación de ofertas de conductores.

**P: ¿Qué pasa si no aplico el fix?**
R: Los conductores seguirán sin poder crear/aceptar ofertas.

**P: ¿Es reversible?**
R: Sí, pero probablemente quieras que sea permanente. La política anterior causaba recursión.
