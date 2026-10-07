-- Índices en las tablas más consultadas de la app. Ninguna tenía índices propios
-- (las llaves foráneas en Postgres NO se indexan solas), así que estas consultas
-- hacían un recorrido completo de la tabla. No afecta hoy con pocos datos, pero
-- es necesario antes de crecer en usuarios y en historial.

-- routes: la vista available_rides filtra por status + departure_time en cada
-- búsqueda de pasajero y en "Salidas de hoy". driver_id se usa en los paneles del conductor.
CREATE INDEX IF NOT EXISTS routes_status_departure_idx ON public.routes (status, departure_time);
CREATE INDEX IF NOT EXISTS routes_driver_idx ON public.routes (driver_id);

-- bookings: se consulta por pasajero en cada apertura del inicio, y por ruta al
-- excluir viajes ya reservados o al cerrar una ruta.
CREATE INDEX IF NOT EXISTS bookings_passenger_status_idx ON public.bookings (passenger_id, booking_status);
CREATE INDEX IF NOT EXISTS bookings_route_idx ON public.bookings (route_id);

-- reviews: reviewee_id se usa en una subconsulta correlacionada dentro de la vista
-- available_rides (cuenta de reseñas por conductor), que corre una vez por cada fila
-- de la vista. Sin índice, esto se vuelve más lento a medida que crecen las reseñas.
CREATE INDEX IF NOT EXISTS reviews_reviewee_idx ON public.reviews (reviewee_id);

-- notifications: se consulta por usuario ordenando por fecha en cada apertura de
-- la pantalla de alertas y del contador del navbar.
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

-- negotiation_messages: cada hilo de chat de rutas personalizadas se busca por
-- request_id + driver_id.
CREATE INDEX IF NOT EXISTS negotiation_messages_thread_idx ON public.negotiation_messages (request_id, driver_id);
