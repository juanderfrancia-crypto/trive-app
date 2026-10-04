-- Fase 2j: listados de documentos para el administrador.
-- Las funciones devolvían columnas con tipos distintos a los de la tabla (varchar, integer, timestamp),
-- y PostgreSQL rechazaba la consulta. Ahora cada columna se convierte al tipo declarado.
-- Siguen exigiendo administrador (is_admin_user).

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
  ORDER BY dd.status ASC, dd.uploaded_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_processed_documents_for_admin()
RETURNS TABLE(
  id uuid, driver_id uuid, driver_name text, document_type text, file_path text,
  file_name text, file_size bigint, file_type text, status text, rejection_reason text,
  expiry_date date, uploaded_at timestamp with time zone, verified_at timestamp with time zone,
  updated_at timestamp with time zone, created_at timestamp with time zone
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
    COALESCE(p.name, p.email, 'Desconocido')::text,
    dd.document_type::text,
    dd.file_path::text,
    dd.file_name::text,
    dd.file_size::bigint,
    dd.file_type::text,
    dd.status::text,
    dd.rejection_reason::text,
    dd.expiry_date,
    dd.uploaded_at::timestamptz,
    dd.verified_at::timestamptz,
    dd.updated_at::timestamptz,
    dd.created_at::timestamptz
  FROM public.driver_documents dd
  JOIN public.profiles p ON p.id = dd.driver_id
  WHERE dd.status IN ('verified', 'rejected', 'expired')
  ORDER BY COALESCE(dd.verified_at, dd.updated_at) DESC
  LIMIT 100;
END;
$$;
