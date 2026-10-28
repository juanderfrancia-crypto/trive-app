# Sistema de Manejo de Errores Amigables - TRIVE

## 📋 Visión General

Sistema centralizado de manejo de errores que transforma errores técnicos en mensajes amigables para el usuario final.

## 🛠️ Componentes

### 1. **errorHandler.ts** (Servicio Principal)
Localización: `src/services/errorHandler.ts`

Responsabilidades:
- Categorizar errores por tipo (Network, Auth, Validation, Database, Payment, File)
- Convertir errores técnicos → mensajes amigables en español
- Registrar logs internos para debugging
- Mostrar Toast automáticamente
- Reportar errores críticos (cuando se implemente)

**Tipos de Error:**
```
- NETWORK_ERROR: Problemas de internet/conexión
- AUTH_ERROR: Autenticación/permisos fallidos  
- VALIDATION_ERROR: Datos inválidos/incompletos
- DATABASE_ERROR: Errores de BD/Supabase
- PAYMENT_ERROR: Fallos en pagos
- FILE_ERROR: Problemas con archivos
- UNKNOWN_ERROR: Errores genéricos
```

### 2. **useNetworkStatus.ts** (Hook)
Localización: `src/hooks/useNetworkStatus.ts`

Detecta:
- Conexión actual (online/offline)
- Tipo de conexión (WiFi, cellular, none)
- Cambios en tiempo real

Retorna:
```typescript
{
  isOnline: boolean,
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown',
  isWifi: boolean,
  isCellular: boolean
}
```

### 3. **OfflineBanner.tsx** (Componente)
Localización: `src/components/OfflineBanner.tsx`

Muestra banner rojo en top si sin internet:
```
📡 Sin conexión a internet
```

### 4. **Toast Component** (Ya existía)
Sistema de notificaciones emergentes amigables

## 📱 Implementación por Screen

### LoginScreen.tsx

✅ Importaciones:
```typescript
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler'
import OfflineBanner from '../components/OfflineBanner'
```

✅ Errores Manejados:
- **Sin internet**: ErrorType.NETWORK
- **Credenciales inválidas**: ErrorType.AUTH + mensaje personalizado
- **Error de BD**: handleSupabaseError()
- **Login con Google/Apple**: Mismos patrones

✅ Ejemplo de Uso:
```typescript
try {
  const data = await login(email, password)
  // Éxito
} catch (err: any) {
  if (err.message?.includes('Network')) {
    errorHandler.handle('Sin conexión a internet', ErrorType.NETWORK, ...)
  } else if (err.message?.includes('credentials')) {
    errorHandler.handle('Correo o contraseña incorrectos', ErrorType.AUTH, ...)
  }
}
```

### BookingScreen.tsx

✅ Importaciones:
```typescript
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler'
import OfflineBanner from '../components/OfflineBanner'
```

✅ Errores Manejados:
- **Asiento ya reservado**: ErrorType.VALIDATION
- **Sin internet**: ErrorType.NETWORK
- **Error de BD**: handleSupabaseError()
- **Éxito de booking**: Mensaje positivo

✅ Ejemplo de Uso:
```typescript
if (error.code === 'SEAT_ALREADY_RESERVED') {
  errorHandler.handle(
    'Uno de los asientos ya fue reservado',
    ErrorType.VALIDATION,
    ErrorSeverity.MEDIUM,
    true,
    { context: 'seat_conflict' }
  )
}
```

## 🎯 Mensajes Amigables (ES)

| Tipo | Mensaje |
|------|---------|
| NETWORK | 📡 Sin conexión a internet. Verifica tu WiFi o datos móviles. |
| AUTH | 🔐 Error de autenticación. Por favor inicia sesión de nuevo. |
| VALIDATION | ✏️ Algunos datos no son válidos. Revisa la información. |
| DATABASE | 🔧 Tuvimos un problema. Por favor intenta más tarde. |
| PAYMENT | 💳 No pudimos procesar el pago. Intenta con otro método. |
| FILE | 📁 Problema al procesar el archivo. Intenta de nuevo. |
| UNKNOWN | ⚠️ Algo salió mal. Por favor intenta de nuevo. |

## 📊 Severidad de Errores

```typescript
enum ErrorSeverity {
  LOW = 'low',           // Información, no es error
  MEDIUM = 'medium',     // Error normal, Toast 3s
  HIGH = 'high',         // Error importante, Toast 5s
  CRITICAL = 'critical', // Error grave, Toast 5s + reportar
}
```

## 🔍 Métodos Disponibles

### handle()
Manejo genérico de errores:
```typescript
errorHandler.handle(
  error: Error | string,
  type?: ErrorType,
  severity?: ErrorSeverity,
  showToast?: boolean,
  context?: Record<string, any>
)
```

### handleApiError()
Detecta automáticamente HTTP status:
```typescript
errorHandler.handleApiError(error, { context: 'booking_api' })
```

### handleSupabaseError()
Traduce códigos PostgreSQL:
```typescript
errorHandler.handleSupabaseError(error, 'operation_name', context)
```

### handlePaymentError()
Errores de pago específicos:
```typescript
errorHandler.handlePaymentError(error, context)
```

### handleFileError()
Errores de archivos:
```typescript
errorHandler.handleFileError(error, context)
```

## 📝 Logging para Debug

Los errores se registran con:
- Timestamp
- Tipo
- Severidad
- Contexto (datos útiles)
- Stack trace (en desarrollo)

Acceder a logs:
```typescript
const logs = errorHandler.getLogs()
console.log(JSON.stringify(errorHandler.exportLogs(), null, 2))
```

## 🚀 Proximas Mejoras

☑️ **Implementar tabla error_logs en Supabase**
```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY,
  type TEXT,
  severity TEXT,
  message TEXT,
  context JSONB,
  stack TEXT,
  user_id UUID,
  timestamp TIMESTAMP
)
```

☑️ **Integración con Sentry** (Para errores en producción)

☑️ **Retry automático** para errores de red

☑️ **Pantalla OfflineScreen** completa cuando sin internet prolongado

☑️ **Analytics** para rastrear errores más comunes

## ✅ Checklist Implementación

- ✅ LoginScreen: Errores de autenticación manejados
- ✅ BookingScreen: Errores de reserva manejados
- ✅ LoginPhoneScreen: Revisar y implementar (similar a LoginScreen)
- ✅ RegisterScreen: Revisar y implementar
- ✅ SearchScreen: Revisar y implementar
- ✅ SeatSelectionScreen: Revisar y implementar
- ✅ DriverRegisterScreen: Revisar si necesita
- ✅ Todos los screens con API calls: Revisar y implementar

## 🎨 Ejemplo Completo

```typescript
const handleImportantAction = async () => {
  try {
    const result = await apiCall()
    // Éxito
    showSuccessMessage()
  } catch (error: any) {
    // Detectar tipo
    if (error.message?.includes('Network')) {
      errorHandler.handle(
        'Sin conexión',
        ErrorType.NETWORK,
        ErrorSeverity.HIGH,
        true,
        { action: 'important_action' }
      )
    } else if (error.status === 400) {
      errorHandler.handleApiError(error, { action: 'important_action' })
    } else {
      errorHandler.handle(
        error,
        ErrorType.UNKNOWN,
        ErrorSeverity.MEDIUM,
        true,
        { action: 'important_action' }
      )
    }
  }
}
```

## 🔗 Referencias

- **Toast Component**: `src/components/Toast.tsx`
- **Error Handler**: `src/services/errorHandler.ts`
- **Network Hook**: `src/hooks/useNetworkStatus.ts`
- **Offline Banner**: `src/components/OfflineBanner.tsx`

---

*Última actualización: 12 de Abril de 2026*
