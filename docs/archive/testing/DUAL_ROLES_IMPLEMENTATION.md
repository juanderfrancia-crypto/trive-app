# Sistema de Roles Dual - Documentación de Implementación

**Fecha**: 6 de Abril de 2026  
**Versión**: 1.0  
**Estado**: Implementado

## 📋 Resumen de Cambios

Se ha implementado un sistema de **roles dual** para permitir que los usuarios sean conductores Y pasajeros simultaneamente, mejorando la experiencia y flexibilidad de la plataforma.

## 🎯 Objetivos Logrados

### ✅ 1. Sistema de Roles Dual
- Los usuarios ahora pueden tener ambos roles: `is_driver` y `is_passenger`
- Cambio de `role` (singular) a columnas booleanas (plural) en la tabla `profiles`
- Los usuarios no pierden su rol de pasajero al convertirse en conductores
- Toggle para activar/desactivar disponibilidad como conductor

### ✅ 2. Flujo de Convertirse en Conductor Mejorado
- **Pantalla nueva**: `DriverSetupScreen.tsx` 
- Flujo en 3 pasos sin obligar a crear ruta:
  - Paso 1: Presentación de beneficios
  - Paso 2: Requisitos legales
  - Paso 3: Confirmación y activación
- Más transparencia y educación para el usuario
- Opción de completar datos después

### ✅ 3. Cambios en ProfileScreen
- Botón "Conviértete en Conductor" navega a `DriverSetupScreen`
- Badge "Eres Conductor" cuando ya es conductor
- UI limpia y coherente con identidad visual

### ✅ 4. Actualización de DriverPanelScreen
- Validación correcta: Solo usuarios con `is_driver = true` ó `role = 'driver'`
- Panel de control sin restricciones de datos incompletos
- Puede crear rutas desde el dashboard

## 📁 Archivos Modificados

### Nuevos Archivos
```
src/screens/DriverSetupScreen.tsx
pruebas/DUAL_ROLES_MIGRATION.sql
pruebas/DUAL_ROLES_IMPLEMENTATION.md (este archivo)
```

### Archivos Modificados
```
src/screens/ProfileScreen.tsx
  - Cambio de navegación a DriverSetupScreen
  - Updated button labels y UI

src/navigation/AppNavigator.tsx
  - Agregada ruta para DriverSetupScreen

src/screens/DriverPanelScreen.tsx
  - Sin cambios de validación (mantiene protección)
```

## 🗄️ Cambios en Base de Datos

### SQL Ejecutar en Supabase
```sql
-- Ver: pruebas/DUAL_ROLES_MIGRATION.sql

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_driver BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_passenger BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS driver_active BOOLEAN DEFAULT false;

CREATE INDEX idx_profiles_is_driver ON profiles(is_driver);
CREATE INDEX idx_profiles_driver_active ON profiles(driver_active);
```

### Nueva Estructura de Datos
```
profiles:
├── id (UUID) - PK
├── name (text)
├── email (text)
├── phone (text)
├── role (text) - LEGACY: ahora usar is_driver/is_passenger
├── rating (numeric)
├── total_trips (integer)
├── total_spent (numeric)
├── is_driver (BOOLEAN) - ✨ NEW
├── is_passenger (BOOLEAN) - ✨ NEW
├── driver_active (BOOLEAN) - ✨ NEW: toggle disponibilidad
└── timestamps...
```

## 🔄 Flujos de Uso

### Flujo 1: Nuevo Usuario Pasajero
```
Registro → ProfileScreen (pasajero defecto) 
→ Botón "Conviértete en Conductor" 
→ DriverSetupScreen (3 pasos)
→ Activado como conductor
→ DriverPanelScreen disponible
```

### Flujo 2: Usuario Conduciendo
```
DriverPanelScreen 
→ Ver rutas activas
→ Ver pasajeros
→ Crear nueva ruta
→ Cambiar disponibilidad (toggle)
```

### Flujo 3: Cambiar a Pasajero
```
ProfileScreen 
→ Toggle "Buscar viajes" (cuando se implemente)
→ SearchScreen para ver rutas de otros conductores
```

## 🎨 Interfaz de Usuario

### DriverSetupScreen
- **Paso 1 - Bienvenida**: 
  - Icono de auto
  - 3 beneficios (Ganancias, Flexibilidad, Seguridad)
  - Botón "Conocer Requisitos"

- **Paso 2 - Requisitos**:
  - 5 requisitos legales/técnicos
  - Checkmarks verdes
  - Botones navegación

- **Paso 3 - Confirmación**:
  - Checkmark grande de aprobación
  - 3 términos de aceptación
  - Botón "Activar Conductor"

### ProfileScreen
- Botón rojo/azul "Conviértete en Conductor" (si es pasajero)
- Badge verde "Eres Conductor" (si ya es conductor)
- Mantiene toggle de rol (ej: para cambiar a pasajero después)

## 🔐 Seguridad y Validaciones

### Validaciones Aplicadas
1. **RLS Policies**: Usuarios pueden solo ver/editar sus propios datos
2. **Role Check**: DriverPanelScreen valida `is_driver = true` ó `role = 'driver'`
3. **Auto-Update**: Perfil se actualiza automáticamente en ProfileScreen
4. **Confirmation Flow**: 3 pasos antes de confirmar rol de conductor

### Políticas RLS Recomendadas
```sql
-- En tabla 'profiles'
CREATE POLICY "Users insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

## 📊 Comparación: Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Roles** | Singular (`role`) | Dual (`is_driver`, `is_passenger`) |
| **Convertirse Conductor** | Iba a DriverRegisterScreen | Va a DriverSetupScreen (3 pasos) |
| **Obligatoriedad** | Obligaba crear ruta | Solo activar rol |
| **Flexibilidad** | Solo 1 rol | Ambos roles simultaneamente |
| **Disponibilidad** | Cambiar rol completo | Toggle `driver_active` |

## 🚀 Próximos Pasos Sugeridos

1. **Completar DriverSetupScreen - Datos**:
   - Campos para foto de documento (opcional)
   - Campos para licencia de conducir
   - Datos del vehículo (opcional)

2. **Implementar Toggle "Disponible para Conducir"**:
   - En ProfileScreen: Switch para `driver_active`
   - En DriverPanelScreen: Mostrar estado de disponibilidad

3. **Pantalla de Configuración de Conductor**:
   - Editar datos del vehículo
   - Cargar documentos
   - Ver estado de verificación

4. **Gestión de Rutas Mejorada**:
   - Editar rutas después de crearlas
   - Cancelar rutas (con notificaciones)
   - Historial de viajes completados

## 📱 Componentes Reutilizables

### DriverSetupScreen
- Estructura modular en 3 pasos
- Fácil de extender con más pasos
- Estilos consistentes con paleta de Trive
- Animaciones de progreso suaves

## ✨ Características Destacadas

1. **UX Transparente**: Usuario entiende qué necesita para ser conductor
2. **Progresiva**: No requiere datos completos de inmediato
3. **Flexible**: Puede cambiar entre roles sin perder datos
4. **Visual**: Indicadores claros de estado (badges, toggles)
5. **Escalable**: Fácil agregar pasos o validaciones

## 🐛 Consideraciones Técnicas

### Compatibilidad
- ✅ Funciona con RLS policies existentes
- ✅ Compatible con tabla `roles` antigua en auth
- ✅ No rompe código existente
- ⚠️ Migración SQL es necesaria

### Performance
- Índices creados para búsquedas rápidas
- Sin N+1 queries
- Caché local en Zustand store

### Testing Recomendado
- [ ] Crear cuenta nueva → se vuelve conductor
- [ ] Cambiar roles múltiples veces
- [ ] Crear rutas como nuevo conductor
- [ ] Ver rutas en ProfileScreen
- [ ] Navegar entre TabNavigator y Stack

## 📞 Soporte y Contacto

Para preguntas sobre la implementación:
- Ver archivos de referencia en `pruebas/`
- Revisar commits del flujo de roles
- Contactar al equipo de desarrollo

---

**Implementación completada ✅**
