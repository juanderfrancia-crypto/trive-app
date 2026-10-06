-- Al borrar un usuario, sus reservas se borran en cascada y estos triggers usan "routes" sin esquema.
-- Auth ejecuta el borrado con otro search_path y falla con "relation routes does not exist".

ALTER FUNCTION public.update_route_available_seats() SET search_path = public;
ALTER FUNCTION public.handle_booking_completion() SET search_path = public;
