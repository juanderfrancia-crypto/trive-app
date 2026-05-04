# 🚀 Trive App - Guía de Configuración Supabase

## ✅ Fase 1: Configuración Completada

### 1. Credenciales Configuradas ✓
- **URL**: `https://feqgykwrpfsxtlllbhpx.supabase.co` en `src/services/supabase.ts`
- **ANON_KEY**: Configurada
- **Conexión**: Lista para usar

### 2. Estructura de Código Creada ✓
Se crearon hooks reutilizables en `src/hooks/`:
- **`useAuth.ts`** - Autenticación (login, register, logout)
- **`useRoutes.ts`** - Gestión de rutas/viajes
- **`useBookings.ts`** - Gestión de reservas
- **`useProfile.ts`** - Gestión de perfiles de usuario
- **`useAppStore.ts`** - Estado global actualizado (Zustand)

---

## 📋 Fase 2: Crear Tablas en Supabase (PRÓXIMO PASO)

### Instrucciones:

1. **Entra a tu Supabase Dashboard**
   - Ir a: https://supabase.com
   - Selecciona tu proyecto "trive-app"

2. **Abre el SQL Editor**
   - Selecciona el icono de SQL (parte izquierda del dashboard)
   - Click en "+ New Query"

3. **Copia el script completo**
   - Abre el archivo `DATABASE_SETUP.sql` en este proyecto
   - Copia TODO el contenido

4. **Pega y ejecuta**
   - Pegalo en el SQL Editor de Supabase
   - Click en "Run"
   - ✅ Debe ejecutarse sin errores

### ¿Qué hace el SQL?
```
✅ Crea tabla "profiles" - Perfiles de usuarios
✅ Crea tabla "routes" - Rutas/viajes
✅ Crea tabla "bookings" - Reservas de pasajeros
✅ Crea tabla "drivers" - Info de conductores
✅ Crea tabla "reviews" - Calificaciones
✅ Configura Row Level Security (RLS)
✅ Inserta datos de prueba (opcional)
```

---

## 🔓 Habilitar Autenticación en Supabase

1. **Authentication**
   - Dashboard → Authentication → Providers
   - Asegúrate que "Email" esté habilitado
   - Click "Enable" si no está

2. **Email Confirmación** (opcional para desarrollo)
   - Authentication → Email Templates
   - Para MVP, puedes desactivar verificación de email en desarrollo

---

## 📱 Próximos Pasos

### ✅ Una vez estén las tablas:
1. Actualizaré **LoginScreen** para usar autenticación real
2. Actualizaré **RegisterScreen** para crear usuarios en BD
3. Conectaré **SearchScreen** para buscar rutas reales
4. Conectaré **BookingScreen** para guardar reservas reales
5. Conectaré **ProfileScreen** para mostrar datos reales

### 📊 Estado del Desarrollo
```
✓ Backend (Supabase) - Config lista
✓ Hooks (lógica) - 4 hooks creados
✓ Store (estado) - Actualizado
⏳ Pantallas - En siguiente fase
⏳ Base de datos - EN PROCESO (ejecuta el SQL)
```

---

## 🧪 Testing Local

Una vez ejecutes el SQL, puedes probar:

```bash
# En tu terminal (desde la raíz del proyecto)
npm start
# o
expo start

# En Expo: presiona "w" para web o "i/a" para iOS/Android
```

Las credenciales de prueba que creamos en SQL son:
- **Email**: juan@test.com
- **Contraseña**: (no tiene, necesitas crear tu contraseña)

---

## ⚠️ Muy Importante

1. **El archivo `DATABASE_SETUP.sql` contiene:**
   - Todas las tablas necesarias
   - Políticas de seguridad (RLS)
   - Datos de prueba

2. **Solo cópialo y ejecútalo UNA VEZ**
   - Si lo ejecutas 2 veces, habrá conflictos
   - Si necesitas limpiar: usa SQL `DROP TABLE IF EXISTS` (cuidado!)

3. **Credenciales seguras:**
   - Las credenciales están en `src/services/supabase.ts`
   - Para producción, muévelas a `.env` (no que se vean en git)

---

## ❓ ¿Necesitas ayuda?

Si algo falla:
1. Verifica que el SQL ejecutó sin errores
2. Confirma que estás en el proyecto correcto de Supabase
3. Avísame qué error ves

**¡Adelante!** 🚀
