-- Al borrar un usuario, la cascada de reservas ejecuta este trigger con el rol de Auth,
-- que no tiene permiso sobre routes. Se ejecuta con los permisos del dueño de la función.

ALTER FUNCTION public.update_route_available_seats() SECURITY DEFINER;
