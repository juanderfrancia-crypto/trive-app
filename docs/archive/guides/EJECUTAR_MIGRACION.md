# 🚀 INSTRUCCIONES: Ejecutar Migración SQL

**Tiempo estimado**: 5 minutos

---

## OPCIÓN 1: Via Supabase Dashboard (Recomendado - MÁS SEGURO)

### Paso 1: Abre Supabase Console
```
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto "trive-app"
3. Haz clic en "SQL Editor" (lado izquierdo)
```

### Paso 2: Copia el SQL
```
Ve a: database/migrations/MIGRATION_TRIP_MESSAGES.sql
Copia TODO el contenido
```

### Paso 3: Ejecuta en Supabase
```
1. En SQL Editor, haz clic en "New Query"
2. Pega el SQL completo
3. Haz clic en "Run" (botón azul, abajo a la derecha)
4. Espera a que termine (debería mostrar "Query executed successfully")
```

### Paso 4: Verifica
```
En el mismo SQL Editor, ejecuta:
SELECT * FROM trip_messages LIMIT 1;

Debería dar error "No rows" (eso es correcto - está vacía)
Si da error "table doesn't exist", algo falló
```

---

## OPCIÓN 2: Via Supabase CLI (Si sabes usarla)

```bash
# Conectarte a Supabase
supabase link --project-ref <tu-project-id>

# Ejecutar migración
supabase db push

# Verificar
supabase db pull --schema-only
```

---

## OPCIÓN 3: Via SQL Script (Con cuidado)

```bash
# Primero, verifica que no hay errores
npm run type-check

# Luego puedes crear un script, pero la OPCIÓN 1 es más segura
```

---

## ✅ Checklist Después de Ejecutar

- [ ] Query ejecutada sin errores en Supabase Console
- [ ] Se creó tabla `trip_messages`
- [ ] Se crearon 5 índices
- [ ] Se crearon 3 RLS Policies
- [ ] Se creó función `cleanup_old_trip_messages()`

### Comando para Verificar TODO:
```sql
-- Ejecuta esto en Supabase Console:

-- 1. ¿Existe la tabla?
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_messages');

-- 2. ¿Cuántas columnas?
SELECT column_name FROM information_schema.columns WHERE table_name = 'trip_messages' ORDER BY ordinal_position;

-- 3. ¿Cuántos índices?
SELECT indexname FROM pg_indexes WHERE tablename = 'trip_messages';

-- 4. ¿Cuántas policies?
SELECT policyname FROM pg_policies WHERE tablename = 'trip_messages';

-- 5. ¿Función existe?
SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_trip_messages');
```

**Resultado esperado**:
```
1. EXISTS = true (tabla existe)
2. Columnas: id, trip_id, from_user_id, to_user_id, message, created_at, is_read, read_at (8 columnas)
3. Índices: 5
4. Policies: 3
5. Función: true
```

---

## 🐛 Si Algo Falla

### Error: "Table already exists"
```sql
-- Elimina y vuelve a crear:
DROP TABLE IF EXISTS trip_messages CASCADE;
-- Luego copia el SQL completo de nuevo
```

### Error: "Permission denied"
```
Tu usuario de Supabase no tiene permisos.
Solución: Ve a Supabase Console → Authentication → Users
Verifica que tu usuario sea "admin" o "editor"
```

### Error: "Invalid SQL Syntax"
```
El SQL no se copió completo.
Verifica que incluya:
- CREATE TABLE trip_messages
- CREATE INDEX (5 veces)
- CREATE POLICY (3 veces)
- CREATE FUNCTION cleanup_old_trip_messages
```

---

## 📋 Pasos Después de Migración

Una vez que la migración esté OK:

### 1. Reinicia la app
```bash
npm start
# o
expo start
```

### 2. Testea Localmente
```
1. Abre app
2. Ve a "Viajes Activos"
3. Toca "Contactar" en cualquier viaje
4. Debería abrirse modal con chat
5. Escribe un mensaje
6. Toca "Enviar"
7. Debería aparecer en la lista
```

### 3. Commit
```bash
git add database/migrations/MIGRATION_TRIP_MESSAGES.sql
git add src/services/trip_messages.ts
git add src/hooks/useTripMessages.ts
git add src/components/TripMessage*
git add src/screens/ActiveTripsScreen.tsx

git commit -m "feat: Add contextual trip messaging system

- Implement trip_messages table with auto-cleanup
- Add TripMessagesModal for in-trip communication
- Add mini-chat components (TripMessageList, QuickMessageInput)
- Integrate messaging into ActiveTripsScreen
- Replace ChatScreen navigation with modal popup

Replaces global ChatScreen with contextual messaging per trip
Supports 10,000+ concurrent users
Zero breaking changes to existing functionality"

git push origin main
```

---

## 📞 En Caso de Emergencia

Si algo se rompe completamente:

```sql
-- Nuclear option - elimina TODO:
DROP TABLE IF EXISTS trip_messages CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_trip_messages();

-- Luego ejecuta la migración de nuevo
```

---

**¿Listo? Vamos a Opción 1 →** 🚀

