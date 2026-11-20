-- La duración por defecto al publicar desde una plantilla ya no es un número fijo
-- (3 horas) igual para cualquier ruta, corta o larga. Se guarda la última duración
-- real que el conductor usó al publicar esa plantilla, para que el estimado parta
-- de su propia experiencia en esa ruta en vez de un número genérico.
alter table public.route_templates
  add column if not exists last_duration_minutes integer;

comment on column public.route_templates.last_duration_minutes is
  'Última duración (en minutos) que el conductor usó al publicar esta plantilla. Null si nunca se ha publicado.';
