-- anon no debe tener ningún privilegio de escritura sobre profiles.
-- No era explotable (RLS exige auth.uid() = id, que anon nunca tiene),
-- pero el GRANT de más quedó de cuando se creó la tabla sin acotar permisos.
revoke insert, update, delete, truncate, references, trigger on table public.profiles from anon;
