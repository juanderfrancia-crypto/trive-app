-- 🔐 ROW LEVEL SECURITY POLICIES PARA TRIVE
-- Ejecutar estas queries en Supabase SQL Editor ANTES de lanzar a producción
-- Esto previene que usuarios accedan datos ajenos

-- ============================================================================
-- 1️⃣ ENABLE RLS EN TODAS LAS TABLAS
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2️⃣ PROFILES TABLE - Cada usuario solo ve su propio perfil
-- ============================================================================

-- Policy: Users can see their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 3️⃣ ROUTES TABLE - Conductores ven sus propias rutas, pasajeros ven públicas
-- ============================================================================

-- Policy: Drivers can see/manage their own routes
DROP POLICY IF EXISTS "Drivers can see own routes" ON public.routes;
CREATE POLICY "Drivers can see own routes" ON public.routes
  FOR SELECT
  USING (auth.uid() = driver_id);

-- Policy: Passengers can see public routes (routes that have available seats)
DROP POLICY IF EXISTS "Passengers can search public routes" ON public.routes;
CREATE POLICY "Passengers can search public routes" ON public.routes
  FOR SELECT
  USING (
    status != 'cancelled' 
    AND available_seats > 0
    AND departure_time > NOW()
  );

-- Policy: Drivers can insert their own routes
DROP POLICY IF EXISTS "Drivers can create routes" ON public.routes;
CREATE POLICY "Drivers can create routes" ON public.routes
  FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

-- Policy: Drivers can update their own routes
DROP POLICY IF EXISTS "Drivers can update own routes" ON public.routes;
CREATE POLICY "Drivers can update own routes" ON public.routes
  FOR UPDATE
  USING (auth.uid() = driver_id);

-- Policy: Drivers can delete their own routes
DROP POLICY IF EXISTS "Drivers can delete own routes" ON public.routes;
CREATE POLICY "Drivers can delete own routes" ON public.routes
  FOR DELETE
  USING (auth.uid() = driver_id);

-- ============================================================================
-- 4️⃣ BOOKINGS TABLE - Usuario solo ve sus bookings
-- ============================================================================

-- Policy: Passengers see their own bookings
DROP POLICY IF EXISTS "Passengers see own bookings" ON public.bookings;
CREATE POLICY "Passengers see own bookings" ON public.bookings
  FOR SELECT
  USING (auth.uid() = passenger_id);

-- Policy: Drivers see bookings for their own routes
DROP POLICY IF EXISTS "Drivers see bookings for own routes" ON public.bookings;
CREATE POLICY "Drivers see bookings for own routes" ON public.bookings
  FOR SELECT
  USING (
    route_id IN (
      SELECT id FROM routes WHERE driver_id = auth.uid()
    )
  );

-- Policy: Passengers create their own bookings
DROP POLICY IF EXISTS "Passengers can book" ON public.bookings;
CREATE POLICY "Passengers can book" ON public.bookings
  FOR INSERT
  WITH CHECK (auth.uid() = passenger_id);

-- Policy: Passengers can cancel their own bookings
DROP POLICY IF EXISTS "Passengers can cancel own booking" ON public.bookings;
CREATE POLICY "Passengers can cancel own booking" ON public.bookings
  FOR UPDATE
  USING (auth.uid() = passenger_id);

-- ============================================================================
-- 5️⃣ DRIVERS TABLE - Solo drivers ven su propia información
-- ============================================================================

-- Policy: Drivers see their own driver profile
DROP POLICY IF EXISTS "Drivers see own driver profile" ON public.drivers;
CREATE POLICY "Drivers see own driver profile" ON public.drivers
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Drivers can update their own driver profile
DROP POLICY IF EXISTS "Drivers can update own driver profile" ON public.drivers;
CREATE POLICY "Drivers can update own driver profile" ON public.drivers
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- 6️⃣ REVIEWS TABLE - Public para ver ratings, pero solo owner puede escribir
-- ============================================================================

-- Policy: Everyone can see reviews (but not personal data)
DROP POLICY IF EXISTS "Reviews are public" ON public.reviews;
CREATE POLICY "Reviews are public" ON public.reviews
  FOR SELECT
  USING (true);

-- Policy: Only rater can insert review
DROP POLICY IF EXISTS "Users can write reviews" ON public.reviews;
CREATE POLICY "Users can write reviews" ON public.reviews
  FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Policy: Only rater can update their own review
DROP POLICY IF EXISTS "Users can update own review" ON public.reviews;
CREATE POLICY "Users can update own review" ON public.reviews
  FOR UPDATE
  USING (auth.uid() = reviewer_id);

-- ============================================================================
-- 📋 VERIFICACIÓN
-- ============================================================================

-- Ejecuta esto para verificar que RLS está habilitado:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- Debería mostrar: profiles, routes, bookings, drivers, reviews con rowsecurity = true

-- ============================================================================
-- ⚠️  IMPORTANTE
-- ============================================================================

-- DESPUÉS de crear estas policies, PRUEBA que:
-- 1. User A NO puede ver rutas de User B
-- 2. User A NO puede ver bookings de User B
-- 3. User A NO puede ver driver info de User B
-- 4. Solo drivers pueden crear rutas
-- 5. Solo passengers pueden crear bookings
-- 6. Todos pueden ver reviews pero solo pueden escribir los suyos

-- Si algo falla, revisa los IDs en la BD y asegúrate que:
-- - auth.uid() devuelve el UUID correcto del usuario autenticado
-- - Los IDs en las tablas coinciden con los UUIDs

-- Para DEBUGging, puedes ejecutar:
-- SELECT auth.uid(); -- Devuelve el UUID del usuario actual
