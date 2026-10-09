-- "No me interesa" para solicitudes de aeropuerto/destino personalizado: un conductor
-- puede ocultar una solicitud pendiente de SU propio feed sin afectar a los demás
-- conductores (la solicitud sigue disponible para que cualquier otro la acepte).

CREATE TABLE IF NOT EXISTS public.airport_request_dismissals (
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.airport_requests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (driver_id, request_id)
);

ALTER TABLE public.airport_request_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers manage their own dismissals" ON public.airport_request_dismissals;
CREATE POLICY "drivers manage their own dismissals"
  ON public.airport_request_dismissals
  FOR ALL
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);
