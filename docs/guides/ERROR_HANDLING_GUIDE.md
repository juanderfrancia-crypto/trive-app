# 📋 Error Handling Robusto - Guía de Integración

## ✅ Feature #4 Complete - ERROR HANDLING ROBUSTO

### 🎯 Lo que se implementó:

1. **ErrorBoundary Component** ([src/components/ErrorBoundary.tsx](src/components/ErrorBoundary.tsx))
   - Captura errores de cualquier componente hijo
   - UI amigable para mostrar el error
   - Dev info en desarrollo (__DEV__)
   - Botón para reintentar

2. **Error Handler Service** ([src/services/errorHandler.ts](src/services/errorHandler.ts))
   - Manejo centralizado de todos los errores
   - Tipos específicos: NETWORK, AUTH, VALIDATION, DATABASE, PAYMENT, FILE
   - Severidades: LOW, MEDIUM, HIGH, CRITICAL
   - Métodos especializados para cada tipo

3. **useErrorHandler Hook** ([src/hooks/useErrorHandler.ts](src/hooks/useErrorHandler.ts))
   - Fácil acceso a error handling en componentes
   - Callbacks predefinidas para cada tipo de error

4. **App.tsx Updated**
   - ErrorBoundary envuelve toda la app
   - Toast mostrado globalmente

---

## 🔧 Cómo Usar:

### En Screens/Componentes:

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ErrorType } from '@/services/errorHandler';

export const MyScreen = () => {
  const { handleError, handleSupabaseError } = useErrorHandler();

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        handleSupabaseError(error, 'login', { email });
        return;
      }

      // Éxito
    } catch (err) {
      handleError(err, ErrorType.NETWORK);
    }
  };

  return (
    // JSX...
  );
};
```

### API Calls:

```typescript
import { errorHandler, ErrorType } from '@/services/errorHandler';

const fetchRoutes = async () => {
  try {
    const response = await fetch('https://api.trive.com/routes');
    const data = await response.json();
    return data;
  } catch (error) {
    errorHandler.handleApiError(error, {
      endpoint: '/routes',
      method: 'GET',
    });
    throw error;
  }
};
```

### Supabase Operations:

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

export const useBooking = () => {
  const { handleSupabaseError } = useErrorHandler();

  const createBooking = async (booking: any) => {
    const { data, error } = await supabase
      .from('bookings')
      .insert([booking]);

    if (error) {
      handleSupabaseError(error, 'create_booking', { bookingId: booking.id });
      return null;
    }

    return data;
  };

  return { createBooking };
};
```

### Payment Operations:

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

export const usePayment = () => {
  const { handlePaymentError } = useErrorHandler();

  const processPayment = async (paymentDetails: any) => {
    try {
      const result = await stripe.processPayment(paymentDetails);
      return result;
    } catch (error) {
      handlePaymentError(error, {
        amount: paymentDetails.amount,
        method: paymentDetails.method,
      });
      return null;
    }
  };

  return { processPayment };
};
```

### File Operations:

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { validateDocumentSize, validateDocumentType } from '@/utils';

export const useDocumentUpload = () => {
  const { handleFileError } = useErrorHandler();

  const uploadDocument = async (file: any) => {
    // Validar tamaño
    const sizeCheck = validateDocumentSize(file.size);
    if (!sizeCheck.valid) {
      handleFileError(new Error(sizeCheck.error));
      return null;
    }

    // Validar tipo
    const typeCheck = validateDocumentType(file.type);
    if (!typeCheck.valid) {
      handleFileError(new Error(typeCheck.error));
      return null;
    }

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(`${Date.now()}-${file.name}`, file);

      if (error) throw error;
      return data;
    } catch (error) {
      handleFileError(error, { fileName: file.name, fileSize: file.size });
      return null;
    }
  };

  return { uploadDocument };
};
```

---

## 📊 Error Types & Handling:

### NETWORK_ERROR
```typescript
// Cuando falla la conexión
errorHandler.handle(
  'No hay conexión',
  ErrorType.NETWORK,
  ErrorSeverity.HIGH
);
```

### AUTH_ERROR
```typescript
// Autenticación fallida, sesión expirada
errorHandler.handle(
  'Sesión expirada',
  ErrorType.AUTH,
  ErrorSeverity.HIGH
);
```

### VALIDATION_ERROR
```typescript
// Datos inválidos del formulario
errorHandler.handle(
  'Email inválido',
  ErrorType.VALIDATION,
  ErrorSeverity.LOW
);
```

### DATABASE_ERROR
```typescript
// Problemas con Supabase
errorHandler.handleSupabaseError(error, 'fetchUsers');
```

### PAYMENT_ERROR
```typescript
// Problemas al procesar pagos
errorHandler.handlePaymentError(error);
```

### FILE_ERROR
```typescript
// Problemas al cargar archivos
errorHandler.handleFileError(error);
```

---

## 🛡️ Error Boundary Behavior:

Cuando ocurre un error no capturado:

1. **Componente se renderiza** con UI de error
2. **Error log se guarda** internamente
3. **Toast muestra** mensaje amigable
4. **Dev info** disponible en modo desarrollo
5. **Botón Reintentar** permite recuperarse

---

## 🔍 Debugging:

### En desarrollo:

```typescript
import { errorHandler } from '@/services/errorHandler';

// Ver todos los errores registrados
console.log(errorHandler.getLogs());

// Filtrar por tipo
console.log(errorHandler.getFilteredLogs(ErrorType.API));

// Filtrar por severidad
console.log(errorHandler.getFilteredLogs(undefined, ErrorSeverity.CRITICAL));

// Exportar para análisis
console.log(errorHandler.exportLogs());
```

### En producción:

Los errores CRÍTICOS se reportarían a backend (ver TODO en errorHandler.ts)

---

## 📝 Integration Checklist:

A continuación, aplicar error handling a estos screens/hooks:

- [ ] **LoginScreen** - Auth errors
- [ ] **DriverRegisterScreen** - Validation + API errors
- [ ] **BookingScreen** - Validation + Payment errors
- [ ] **AdminDocumentsScreen** - File upload errors
- [ ] **useBookings** - Database errors
- [ ] **useRoutes** - API errors
- [ ] **useProfile** - Auth + Database errors

**Patrón básico:**
```typescript
const { handleError } = useErrorHandler();

try {
  // Operación
} catch (error) {
  handleError(error, ErrorType.XXX);
}
```

---

## 🎉 MVP Progress:

```
✅ Rating Visible        (100%)
✅ Cancelación Inteligente (100% - BD migration done)
✅ Validaciones          (100%)
✅ Error Handling        (100%)
⏳ Push Notifications    (Blocked on APK ~80%)
```

**MVP Status: ~85% sin mapas/pagos**

Próximo: Esperar APK para Feature #5: Push Notifications Testing
