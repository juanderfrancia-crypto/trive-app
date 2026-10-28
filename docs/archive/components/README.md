# 🎨 COMPONENTES DESIGN SYSTEM - TRIVE MVP

Componentes reutilizables para mantener consistencia visual y reducir código duplicado.

---

## 📦 Componentes Disponibles

### 1. **Button** - Botón genérico con múltiples variantes

**Ubicación**: `src/components/Button.tsx`

**Variantes**:
- `primary` (azul, shadow premium)
- `secondary` (azul claro)
- `outline` (sin relleno, solo borde)
- `danger` (rojo para acciones destructivas)
- `ghost` (transparente)

**Tamaños**:
- `sm` (pequeño)
- `md` (medio - default)
- `lg` (grande)
- `xl` (extra grande)

**Propiedades**:
- `onPress?: () => void | Promise<void>` - Callback al presionar
- `variant?: ButtonVariant` - Tipo de botón
- `size?: ButtonSize` - Tamaño del botón
- `loading?: boolean` - Mostrar spinner de carga
- `disabled?: boolean` - Deshabilitado
- `icon?: string` - Nombre del icono (Ionicons)
- `iconPosition?: 'left' | 'right'` - Posición del icono
- `fullWidth?: boolean` - Ancho completo
- `haptic?: boolean` - Haptic feedback (vibración)

**Ejemplos**:

```tsx
// Botón primario simple
<Button onPress={() => console.log('pressed')}>
  Enviar
</Button>

// Botón con icono
<Button variant="primary" size="lg" icon="checkmark" fullWidth>
  Confirmar
</Button>

// Botón en estado de carga
<Button loading variant="primary" disabled>
  Cargando...
</Button>

// Botón peligroso
<Button variant="danger" onPress={handleDelete}>
  Eliminar
</Button>

// Botón outline
<Button variant="outline" size="sm">
  Cancelar
</Button>
```

**Características Automáticas**:
- ✅ Animación spring en tap (scale 0.95)
- ✅ Haptic feedback (vibración) en tap
- ✅ Manejo de estados de carga
- ✅ Iconos integrados (Ionicons)
- ✅ Accesibilidad básica

---

### 2. **Card** - Contenedor reutilizable

**Ubicación**: `src/components/Card.tsx`

**Variantes**:
- `elevated` (white con shadow, default)
- `flat` (surfaceAlt sin shadow)
- `outlined` (border visible)

**Padding**:
- `none` - Sin padding
- `sm` - SPACING.md (16px)
- `md` - SPACING.lg (24px)
- `lg` - SPACING.xl (32px)

**Propiedades**:
- `variant?: CardVariant` - Tipo de card
- `padding?: CardPadding` - Tamaño del padding
- `children: React.ReactNode` - Contenido
- `style?: ViewStyle` - Estilos adicionales
- `disabled?: boolean` - Opacidad reducida

**Ejemplos**:

```tsx
// Card elevada básica
<Card>
  <Text>Contenido aquí</Text>
</Card>

// Card con padding grande y estilo flat
<Card variant="flat" padding="lg">
  <View>
    <Text style={{ fontSize: 18, fontWeight: '700' }}>Título</Text>
    <Text>Descripción</Text>
  </View>
</Card>

// Card outlined
<Card variant="outlined" padding="md">
  <Text>Card con borde</Text>
</Card>
```

**Shadow Automático** (elevated variant):
- Shadow color: primary dark con 12% opacity
- Elevation: 4

---

### 3. **Badge** - Etiqueta de estado

**Ubicación**: `src/components/Badge.tsx`

**Variantes**:
- `success` (verde)
- `warning` (naranja)
- `error` (rojo)
- `info` (azul)
- `primary` (azul primario)
- `neutral` (gris)

**Tamaños**:
- `sm` (pequeño)
- `md` (medio)
- `lg` (grande)

**Propiedades**:
- `label: string` - Texto de la etiqueta
- `variant?: BadgeVariant` - Tipo
- `size?: BadgeSize` - Tamaño
- `icon?: string` - Icono opcional

**Ejemplos**:

```tsx
// Badge de éxito
<Badge label="Confirmado" variant="success" />

// Badge con icono
<Badge label="Abierto" variant="info" icon="open-outline" />

// Badge de error grande
<Badge label="Cancelado" variant="error" size="lg" />

// Badge de advertencia
<Badge label="Pendiente" variant="warning" />
```

---

### 4. **LoadingIndicator** - Spinner animado

**Ubicación**: `src/components/LoadingIndicator.tsx`

**Tamaños**:
- `sm` (24px)
- `md` (32px)
- `lg` (48px)

**Colores**:
- `primary` (azul)
- `white` (blanco)
- `success` (verde)
- `error` (rojo)

**Ejemplo**:

```tsx
// Spinner pequeño en primario
<LoadingIndicator size="sm" />

// Spinner grande en blanco
<LoadingIndicator size="lg" color="white" />

// Con overlay full screen
<LoadingOverlay visible={isLoading} label="Procesando..." />
```

---

### 5. **EmptyState** - Pantalla vacía

**Ubicación**: `src/components/EmptyState.tsx`

**Propiedades**:
- `icon?: string` - Icono Ionicons
- `title: string` - Título
- `description?: string` - Descripción
- `actionLabel?: string` - Texto del botón
- `onAction?: () => void` - Callback del botón

**Ejemplo**:

```tsx
<EmptyState
  icon="inbox-outline"
  title="Sin viajes"
  description="No tienes viajes próximos"
  actionLabel="Ver viajes disponibles"
  onAction={() => navigation.navigate('Search')}
/>
```

---

## 🎯 Guía de Migración

### De TouchableOpacity → Button

**Antes**:
```tsx
<TouchableOpacity 
  style={styles.btn}
  onPress={handlePress}
  activeOpacity={0.88}
>
  <Text style={styles.btnText}>Enviar</Text>
</TouchableOpacity>
```

**Después**:
```tsx
<Button variant="primary" size="md" onPress={handlePress}>
  Enviar
</Button>
```

**Beneficios**:
- ✅ Animación spring automática
- ✅ Haptic feedback
- ✅ Estados de carga incluidos
- ✅ Icono integrado
- ✅ Consistencia visual

### De View → Card

**Antes**:
```tsx
<View style={{
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 16,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  elevation: 3,
}}>
  Contenido
</View>
```

**Después**:
```tsx
<Card padding="md">
  Contenido
</Card>
```

---

## 📊 Integración en Screens

**Ya integrados (imports añadidos)**:
- ✅ HomeScreen
- ✅ LoginPhoneScreen
- ✅ SeatSelectionScreen
- ✅ BookingScreen
- ✅ ProfileScreen
- ✅ TripStatusScreen

**Próximas integraciones**:
- SearchScreen
- AvailableRidesScreen
- WalletScreen
- SettingsScreen

---

## 🎨 Sistema de Colores

Los componentes usan automáticamente el sistema de colores definido en `src/theme/theme.ts`:

```
Primary: #154AA8 (Azul tech)
Success: #10B981 (Verde)
Warning: #F59E0B (Naranja)
Error: #EF4444 (Rojo)
Info: #154AA8 (Mismo que primary)
```

---

## 📏 Espaciado & Tamaños

Tokens utilizados:
- `SPACING.xs` = 4px
- `SPACING.sm` = 8px
- `SPACING.md` = 16px
- `SPACING.lg` = 24px
- `SPACING.xl` = 32px

- `RADIUS.sm` = 8px
- `RADIUS.md` = 16px
- `RADIUS.lg` = 24px
- `RADIUS.full` = 9999px

---

## 🚀 Próximas Mejoras

1. **Gradient Button** - Botón con LinearGradient para Login
2. **Toast Animations** - Toasts con entrada suave
3. **Screen Transitions** - Animaciones entre pantallas
4. **Dark Mode** - Soporte para modo oscuro
5. **Lottie Animations** - Animaciones celebración en confirmaciones

---

## ✅ Checklist de Uso

- [ ] Import del componente en el screen
- [ ] Utilizar variantes existentes (no crear estilos inline)
- [ ] Reemplazar TouchableOpacity/View por Button/Card
- [ ] Validar en dispositivo que animaciones se ven suave
- [ ] Testear en modo offline si aplica

