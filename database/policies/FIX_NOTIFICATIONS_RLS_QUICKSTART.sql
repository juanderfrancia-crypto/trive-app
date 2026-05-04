-- 🚀 FIX NOTIFICATIONS RLS - PASO A PASO (2 minutos)

-- ============================================================================
-- ERROR QUE TIENES:
-- ============================================================================
-- Error creating notification: new row violates row-level security policy

-- ============================================================================
-- POR QUÉ OCURRE:
-- ============================================================================
-- Tabla notifications tiene RLS habilitada ✓
-- Pero la política para INSERT es muy restrictiva ✗
-- 
-- El conductor intenta crear notificaciones para PASAJEROS:
--   INSERT notifications { user_id: "pasajero-uuid", ... }
-- Pero la RLS exige:
--   auth.uid() == user_id
-- Y eso no se cumple porque:
--   auth.uid() = "conductor-uuid"
--   user_id = "pasajero-uuid"

-- ============================================================================
-- SOLUCIÓN RÁPIDA (Opción A) - 30 segundos
-- ============================================================================

-- ⏱️ TIEMPO: 30 segundos
-- 🎯 OBJETIVO: Hacer la RLS permisiva para INSERT

-- 1️⃣ Abre Supabase SQL Editor
-- 2️⃣ Copia y ejecuta ESTO:

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Anyone can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- 3️⃣ Espera "Success. No rows returned"
-- 4️⃣ Cierra Expo y abre de nuevo (npm start)
-- 5️⃣ Intenta iniciar viaje → ✅ Debería funcionar

-- ============================================================================
-- SOLUCIÓN SEGURA (Opción B) - 1 minuto
-- ============================================================================

-- Si prefieres una solución más segura usando RPC:

-- 1️⃣ Abre Supabase SQL Editor
-- 2️⃣ Copia TODO desde FIX_NOTIFICATIONS_RLS_SECURE.sql
-- 3️⃣ Pégalo en SQL Editor
-- 4️⃣ Ejecuta los primeros comandos (CREATE FUNCTION)
-- 5️⃣ Espera "Success"
-- 6️⃣ También ejecuta la parte "ALTERNATIVA RÁPIDA" (DROP POLICY + CREATE POLICY)
-- 7️⃣ Cierra Expo y abre de nuevo
-- 8️⃣ Intenta iniciar viaje → ✅ Debería funcionar

-- ============================================================================
-- RECOMENDACIÓN:
-- ============================================================================
-- 🟢 OPCIÓN A (Rápida): Si solo quieres que funcione YA
-- 🟡 OPCIÓN B (Segura): Si quieres mantener algo de estructura

-- Para MVP/desarrollo: Usa OPCIÓN A (30 segundos)
-- Para producción: Revisa OPCIÓN B después

-- ============================================================================
-- VERIFICACIÓN:
-- ============================================================================

-- Para confirmar que el fix funcionó, ejecuta esto:

SELECT 
  policyname, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- Deberías ver:
-- policyname                      | cmd    | qual
-- ────────────────────────────────────────────────────
-- Anyone can create notifications | INSERT | true
-- Users can see own notifications | SELECT | auth.uid() = user_id
-- Users can update own notif...   | UPDATE | auth.uid() = user_id

-- ============================================================================
-- ¡LISTO!
-- ============================================================================

-- Tu error debería desaparecer.
-- Si aún tienes problema, corre el PASO 1 de nuevo.
