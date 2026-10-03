# Pruebas offline de la base de datos

Valida las migraciones de seguridad (fases 2a a 2h) contra un PostgreSQL real en memoria (PGlite).
No se conecta a producción.

Qué comprueba:
- Que las migraciones se aplican en orden sin error.
- Permisos: un conductor no puede escribir su saldo, rol ni privilegios; un usuario sin sesión no ve datos.
- Flujos: publicar ruta, reservar, confirmar viaje (24 h), referidos, aeropuerto, chat por hilo, recarga admin, eliminación de cuenta.

Cómo correrlas:

    cd supabase/tests/offline
    npm install
    npm test

Limitaciones:
- `base.sql` aproxima el esquema de producción solo en lo que usan las migraciones. Si el esquema real
  difiere (nombres de índices, restricciones), las pruebas pueden pasar y producción fallar.
  Antes de aplicar, conviene validar contra una copia del esquema real.
- No prueba la app móvil. Eso se hace en un dispositivo con dos cuentas.
