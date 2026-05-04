-- Agregar columna de punto de desembarque a bookings
ALTER TABLE bookings 
ADD COLUMN dropoff_point VARCHAR(255),
ADD COLUMN dropoff_point_custom BOOLEAN DEFAULT FALSE;

-- dropoff_point: Punto de desembarque (puede ser el destino final o una parada intermedia)
-- dropoff_point_custom: TRUE si es una parada personalizada, FALSE si es el destino final

-- Índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_bookings_dropoff ON bookings(dropoff_point);
