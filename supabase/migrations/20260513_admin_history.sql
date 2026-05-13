-- Función para obtener documentos ya procesados (verificados / rechazados)
-- Espeja la estructura de get_pending_documents_for_admin
CREATE OR REPLACE FUNCTION get_processed_documents_for_admin()
RETURNS TABLE (
  id                uuid,
  driver_id         uuid,
  driver_name       text,
  document_type     text,
  file_path         text,
  file_name         text,
  file_size         bigint,
  file_type         text,
  status            text,
  rejection_reason  text,
  expiry_date       date,
  uploaded_at       timestamptz,
  verified_at       timestamptz,
  updated_at        timestamptz,
  created_at        timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo usuarios con role = 'support' pueden llamar esta función
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'support'
  ) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT
    dd.id AS id,
    dd.driver_id,
    COALESCE(p.name, p.email, 'Desconocido')::text AS driver_name,
    dd.document_type,
    dd.file_path,
    dd.file_name,
    dd.file_size,
    dd.file_type,
    dd.status::text,
    dd.rejection_reason,
    dd.expiry_date,
    dd.uploaded_at,
    dd.verified_at,
    dd.updated_at,
    dd.created_at
  FROM driver_documents dd
  JOIN profiles p ON p.id = dd.driver_id
  WHERE dd.status IN ('verified', 'rejected', 'expired')
  ORDER BY COALESCE(dd.verified_at, dd.updated_at) DESC
  LIMIT 100;
END;
$$;
