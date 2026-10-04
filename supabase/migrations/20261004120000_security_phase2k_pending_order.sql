-- Fase 2k: orden de la cola de revisión de documentos.
-- Primero los pendientes de subida, luego los que están en revisión y al final los rechazados.
-- Dentro de cada grupo, el más antiguo primero (así no se quedan esperando los que llevan más tiempo).

CREATE OR REPLACE FUNCTION public.get_pending_documents_for_admin()
RETURNS TABLE(
  id uuid, driver_id uuid, document_type text, file_path text, file_name text,
  file_size bigint, file_type text, status text, rejection_reason text, expiry_date date,
  created_at timestamp with time zone, uploaded_at timestamp with time zone,
  verified_at timestamp with time zone, updated_at timestamp with time zone, driver_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT
    dd.id,
    dd.driver_id,
    dd.document_type::text,
    dd.file_path::text,
    dd.file_name::text,
    dd.file_size::bigint,
    dd.file_type::text,
    dd.status::text,
    dd.rejection_reason::text,
    dd.expiry_date,
    dd.created_at::timestamptz,
    dd.uploaded_at::timestamptz,
    dd.verified_at::timestamptz,
    dd.updated_at::timestamptz,
    p.name::text
  FROM public.driver_documents dd
  JOIN public.profiles p ON dd.driver_id = p.id
  WHERE dd.status IN ('pending', 'verifying', 'rejected')
  ORDER BY
    CASE dd.status WHEN 'pending' THEN 1 WHEN 'verifying' THEN 2 ELSE 3 END,
    COALESCE(dd.uploaded_at, dd.created_at) ASC;
END;
$$;
