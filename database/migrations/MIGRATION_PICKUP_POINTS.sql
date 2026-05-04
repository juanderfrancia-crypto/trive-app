-- Agregar columnas de punto de salida personalizado a routes
ALTER TABLE routes 
ADD COLUMN pickup_point VARCHAR(255),
ADD COLUMN pickup_point_custom BOOLEAN DEFAULT FALSE;

-- pickup_point: Punto de salida específico (puede ser el origen o una ubicación personalizada)
-- pickup_point_custom: TRUE si es un punto personalizado, FALSE si es el origen estándar

-- Índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_routes_pickup ON routes(pickup_point);
