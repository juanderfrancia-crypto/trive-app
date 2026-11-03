-- Bitácora de acciones sensibles en rutas personalizadas (airport_requests /
-- airport_offers / airport_request_dismissals): quién hizo qué y cuándo,
-- capturado en el servidor con auth.uid(), no reportado por el cliente.
-- Motivo: ante una duda real sobre si una cuenta modificó/descartó algo que
-- el dueño de esa cuenta no recuerda haber hecho, no había ningún registro
-- de quién lo hizo (el audit log nativo de Supabase nunca estuvo activo).

create table public.airport_activity_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null, -- 'insert' | 'update'
  actor_id uuid,
  old_status text,
  new_status text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index idx_airport_activity_log_record on public.airport_activity_log (table_name, record_id);
create index idx_airport_activity_log_created on public.airport_activity_log (created_at desc);

alter table public.airport_activity_log enable row level security;

-- Nadie escribe esta tabla directamente (solo el trigger, que es SECURITY
-- DEFINER y por lo tanto no depende de policies para insertar).
-- Solo administradores pueden leerla (back-office).
create policy "admins_read_airport_activity_log"
  on public.airport_activity_log for select
  using (public.is_admin_user());

revoke all on public.airport_activity_log from public, anon, authenticated;
grant select on public.airport_activity_log to authenticated;

create or replace function public.log_airport_activity()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.airport_activity_log (table_name, record_id, action, actor_id, new_status, detail)
    values (
      tg_table_name,
      new.id,
      'insert',
      auth.uid(),
      case when tg_table_name in ('airport_requests', 'airport_offers') then new.status else null end,
      to_jsonb(new)
    );
  elsif tg_op = 'UPDATE' then
    insert into public.airport_activity_log (table_name, record_id, action, actor_id, old_status, new_status, detail)
    values (
      tg_table_name,
      new.id,
      'update',
      auth.uid(),
      case when tg_table_name in ('airport_requests', 'airport_offers') then old.status else null end,
      case when tg_table_name in ('airport_requests', 'airport_offers') then new.status else null end,
      to_jsonb(new)
    );
  end if;
  return new;
end;
$$;

create trigger trg_log_airport_requests
  after insert or update on public.airport_requests
  for each row execute function public.log_airport_activity();

create trigger trg_log_airport_offers
  after insert or update on public.airport_offers
  for each row execute function public.log_airport_activity();

create trigger trg_log_airport_dismissals
  after insert on public.airport_request_dismissals
  for each row execute function public.log_airport_activity();
