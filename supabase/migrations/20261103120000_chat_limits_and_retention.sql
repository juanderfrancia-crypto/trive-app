-- Endurece ambos sistemas de chat (rutas normales y rutas personalizadas):
-- 1) El límite de 500 caracteres solo existía en el cliente (app); nada en el
--    servidor lo exigía realmente. Se agrega como CHECK en la base de datos,
--    que es el único lugar que no se puede evadir.
-- 2) Los mensajes no tenían ninguna política de borrado: crecían para siempre.
--    Se agrega limpieza diaria de mensajes de viajes/solicitudes que ya
--    terminaron hace más de 90 días (margen para cualquier disputa, no solo
--    "ya no se usa" como con las notificaciones).

alter table public.trip_messages
  add constraint trip_messages_length_check check (char_length(message) <= 500);

alter table public.negotiation_messages
  add constraint negotiation_messages_length_check check (char_length(message_text) <= 500);

create or replace function public.cleanup_old_trip_chat()
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  delete from public.trip_messages tm
  using public.routes r
  where tm.trip_id = r.id
    and r.departure_time < now() - interval '90 days';

  delete from public.negotiation_messages nm
  using public.airport_requests ar
  where nm.request_id = ar.id
    and ar.departure_time < now() - interval '90 days';
end;
$$;

revoke all on function public.cleanup_old_trip_chat() from public, anon, authenticated;

select cron.schedule(
  'cleanup-old-trip-chat',
  '20 9 * * *',
  $$select public.cleanup_old_trip_chat();$$
);
