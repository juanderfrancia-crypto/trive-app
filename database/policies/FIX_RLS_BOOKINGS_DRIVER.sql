-- 🔧 FIX RLS BOOKINGS - PERMITIR DRIVER VER SUS BOOKINGS
-- Ejecuta esto en Supabase SQL Editor

-- Deshabilitar RLS en bookings temporalmente
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;

-- Ahora crea una política simple que permite leer
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Política: Cualquier usuario autenticado puede leer bookings
CREATE POLICY "Authenticated users can read bookings"
  ON public.bookings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política: Solo el pasajero puede insertar su propio booking
DROP POLICY IF EXISTS "Passengers can book" ON public.bookings;
CREATE POLICY "Passengers can book"
  ON public.bookings
  FOR INSERT
  WITH CHECK (auth.uid() = passenger_id);

-- Política: Solo el pasajero puede actualizar su booking
DROP POLICY IF EXISTS "Passengers can cancel own booking" ON public.bookings;
CREATE POLICY "Passengers can cancel own booking"
  ON public.bookings
  FOR UPDATE
  USING (auth.uid() = passenger_id);

-- Verificación
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'bookings';
