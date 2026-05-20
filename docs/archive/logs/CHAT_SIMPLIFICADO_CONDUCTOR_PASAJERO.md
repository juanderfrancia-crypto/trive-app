# Chat Simplificado - Solo Conductor ↔ Pasajero

## ✅ Cambios Realizados

El sistema de chat ahora se limita ÚNICAMENTE a comunicación entre conductor y pasajero.

### **1. TripStatusScreen.tsx**
- ❌ **Removido**: Sección completa "Otros Pasajeros"
- ❌ **Removido**: Botón "Solicitar contacto"
- ❌ **Removido**: Hook `useContactRequests`
- ❌ **Removido**: Hook `useAuth`
- ✅ **Mantiene**: Botón mensaje al conductor ("Contactar conductor")
- ✅ **Mantiene**: Chat rápido con conductor

### **2. ChatScreen.tsx**
- ❌ **Removido**: `useContactRequests` hook
- ❌ **Removido**: Validación de contacto aceptado entre pasajeros
- ❌ **Removido**: Sistema de permisos de chat
- ✅ **Mantiene**: Funcionalidad básica de chat para conductor

### **3. ProfileScreen.tsx**
- ❌ **Removido**: Botón "Solicitudes de Contacto"
- ✅ **Mantiene**: Todos los otros menús

### **4. AppNavigator.tsx**
- ❌ **Removido**: Import de `ContactRequestsScreen`
- ❌ **Removido**: Stack.Screen para `ContactRequests`

---

## 📊 Arquitectura Resultante

```
Usuario
  ↓
TripStatusScreen
  ├─ Botón: "Contactar conductor" ✅
  │   └─ Abre ChatScreen directamente
  ├─ Ver otros pasajeros ❌
  └─ Solicitar contacto a pasajero ❌

ChatScreen
  ├─ Chat con conductor ✅
  │   └─ Sin validaciones de permiso
  └─ Chat entre pasajeros ❌
      └─ Nunca accesible
```

---

## 🔒 Restricciones Implementadas

**✅ PERMITIDO:**
- Chat conductor → pasajero
- Chat pasajero → conductor
- Ver perfil del conductor
- Contactar conductor por cualquier razón

**❌ NO PERMITIDO:**
- Chat pasajero ↔ pasajero
- Solicitudes de contacto entre pasajeros
- Ver lista de otros pasajeros en viaje

---

## 📝 Archivos SIN CAMBIOS

Estos archivos NO necesitan ser ejecutados/modificados:
- ❌ `CONTACT_REQUESTS_SETUP.sql` - No ejecutar en Supabase
- ❌ `useContactRequests.ts` - No usado, puede quedarse como backup
- ❌ `ContactRequestsScreen.tsx` - No usado, puede borrarse

---

## ✅ Estado Actual

El sistema ahora es:
- **Más simple**: Solo 1 tipo de chat (conductor-pasajero)
- **Más seguro**: Sin necesidad de validaciones complejas
- **Más claro**: UX lineal y directa

¿Necesitas que borre los archivos innecesarios (useContactRequests.ts, ContactRequestsScreen.tsx)?
