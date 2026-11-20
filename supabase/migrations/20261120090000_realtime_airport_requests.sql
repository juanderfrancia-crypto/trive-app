-- El contador de "Solicitudes" del navbar (useRequestsBadge.ts) se suscribe a
-- cambios en airport_requests y airport_request_dismissals para bajar solo
-- cuando el pasajero cancela o el conductor descarta una solicitud -- pero
-- ninguna de las dos tablas estaba en la publicación de realtime, así que esos
-- eventos nunca le llegaban al cliente. El contador se quedaba pegado en el
-- número viejo hasta que la pestaña se volvía a montar desde cero.

ALTER PUBLICATION supabase_realtime ADD TABLE public.airport_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.airport_request_dismissals;
