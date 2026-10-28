# 📋 Validaciones Centralizadas - Guía de Uso

## 🎯 Feature #3 Complete - VALIDACIONES CENTRALIZADAS

### ✅ Lo que se implementó:

1. **src/utils/validations.ts** - 15 funciones de validación reutilizables
2. **src/utils/index.ts** - Barrel export para imports simples

---

## 📚 Validaciones Disponibles:

### Email
```typescript
import { validateEmail } from '@/utils';

const result = validateEmail('user@example.com');
if (!result.valid) {
  showToast({ text1: result.error });
}
```

### Teléfono
```typescript
const result = validatePhone('+57 300 123 4567');
if (!result.valid) {
  showToast({ text1: result.error });
}
```

### Contraseña
```typescript
const result = validatePassword('myPassword123');
// Mín 6 caracteres, máx 128
```

### Nombre
```typescript
const result = validateName('Juan Pérez');
// Acepta caracteres latinos, espacios, guiones
// Mín 2, máx 100 caracteres
```

### Precio
```typescript
const result = validatePrice(15000);
// Acepta números, min 0, máx 999999.99
```

### Tamaño de Documento
```typescript
const result = validateDocumentSize(fileInBytes);
// Mín 10KB, máx 5MB
```

### Tipo de Documento
```typescript
const result = validateDocumentType('application/pdf');
// Soporta: PDF, JPG, PNG
```

### Validaciones Complejas:

**Booking:**
```typescript
const result = validateBooking({
  passengerId: 'user123',
  routeId: 'route456',
  seats: 2,
  price: 25000
});
```

**Vehículo:**
```typescript
const result = validateVehicle({
  plate: 'ABC-1234',
  model: 'Toyota Avanza',
  capacity: 7
});
```

**Ruta:**
```typescript
const result = validateRoute({
  origin: 'Cali',
  destination: 'Bogotá',
  departureTime: new Date(),
  estimatedDuration: 240,
  price: 80000,
  availableSeats: 5
});
```

### Validaciones Genéricas:

```typescript
// Requerido
validateRequired(value, 'Nombre completo');

// Longitud mínima
validateMinLength(password, 8, 'Contraseña');

// Longitud máxima
validateMaxLength(description, 500, 'Descripción');
```

---

## 🔧 Patrones de Integración:

### En Screens:

```typescript
import { validateEmail, validatePassword } from '@/utils';
import Toast from 'react-native-toast-message';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Validar email
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      Toast.show({
        type: 'error',
        text1: emailCheck.error,
      });
      return;
    }

    // Validar contraseña
    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      Toast.show({
        type: 'error',
        text1: passCheck.error,
      });
      return;
    }

    // Proceder con login
    loginUser(email, password);
  };

  return (
    // JSX con inputs...
  );
};
```

### En Hooks:

```typescript
import { validateBooking } from '@/utils';

export const useBooking = () => {
  const makeBooking = async (booking: any) => {
    const validation = validateBooking(booking);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Proceder con API call
    return createBooking(booking);
  };
  
  return { makeBooking };
};
```

### En Forms customizados:

```typescript
import { validateEmail } from '@/utils';

const EmailField = ({ value, onChange, onError }: any) => {
  const handleChange = (text: string) => {
    onChange(text);
    
    // Validación en tiempo real
    if (text.length > 5) {
      const validation = validateEmail(text);
      onError(validation.error);
    }
  };

  return (
    <TextInput
      value={value}
      onChangeText={handleChange}
      placeholder="correo@example.com"
    />
  );
};
```

---

## ✨ Beneficios:

✅ **Consistencia** - Mismo formato de validación en toda la app
✅ **Reutilizable** - Importa en cualquier pantalla/hook
✅ **Mensajes localizados** - Errores en español
✅ **Type-safe** - TypeScript integrado
✅ **Fácil de mantener** - Un solo lugar para cambiar reglas
✅ **Testing** - Cada función puede ser testeada aisladamente

---

## 📝 Próximas Integraciones:

Después del Admin Dashboard, volver a estos screens y mejorar:
- LoginScreen
- DriverRegisterScreen  
- BookingScreen
- DriverVehicleScreen
- AdminDocumentsScreen

Usar estas funciones para:
1. Validar inputs antes de enviar
2. Mostrar errores en toast/alerts
3. Deshabilitar botón submit mientras hay errores
4. Feedback visual en campos inválidos

---

## 🎉 Verificación Post-Feature:

Cuando integres validaciones, prueba:
```bash
# TypeScript compilation
npx tsc --noEmit

# En la app, intenta:
1. Bookings con datos inválidos
2. Registro de conductor con email malformado
3. Documento con size > 5MB
4. Ruta con hora en el pasado
```

**Resultado esperado:** Errores claros en español + toast notifications
