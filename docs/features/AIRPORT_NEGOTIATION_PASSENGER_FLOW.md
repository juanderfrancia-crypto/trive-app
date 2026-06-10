# Flujo Pasajero: Cómo ve y acepta contraofertas

## 🚀 Pantalla Principal: Mis Solicitudes (AirportRequestScreen)

**Ubicación:** `src/screens/AirportRequestScreen.tsx`

Pasajero ve su listado de todas las solicitudes con estado:
- ⏳ **Pendiente** - Esperando ofertas de conductores
- ✅ **Aceptada** - Viaje confirmado
- ❌ **Cancelada** - Solicitud cerrada

Tap en una solicitud → Va a **Detalles**

---

## 📋 Pantalla de Detalles: Negociación de Precio (AirportRequestDetailsScreen)

**Ubicación:** `src/screens/AirportRequestDetailsScreen.tsx`

### Sección 1: Información de Solicitud
```
ORIGEN: Cali, Centro
DESTINO: Aeropuerto Alfonso Bonilla
PASAJEROS: 2
SALIDA: Hoy, 3:30 PM
```

### Sección 2: Precio Ofrecido (Contrapropuesta del Pasajero)
```
┌─────────────────────────────┐
│ Precio actual               │
│ $45,000                     │
│                             │
│ Publicado: $50,000          │
│              [Subir oferta] │
└─────────────────────────────┘
```

**¿Cómo funciona?**
- Pasajero ve el precio inicial que publicó ($50,000)
- Si recibe ofertas de conductores pidiendo más ($48,000), puede hacer contraoferta ("Subir oferta")
- Presiona **"Subir oferta"** → Modal con TextInput para ingresar nuevo precio
- Los conductores ven el cambio **al instante**

### Sección 3: Propuestas de Conductores (Las Contraofertas)

**Mientras NO hay viaje confirmado:**
```
┌─────────────────────────────────────────┐
│ Propuestas de conductores (3)           │
│                                         │
│ [Avatar] Juan Carlos            [Propone│
│ ⭐ 4.8                          $42,000]│
│                                         │
│     [Aceptar esta oferta]              │
│                                         │
├─────────────────────────────────────────┤
│ [Avatar] María López            [Acepta│
│ ⭐ 4.9                          $45,000]│
│                                         │
│     [Aceptar esta oferta]              │
│                                         │
├─────────────────────────────────────────┤
│ [Avatar] Pedro García           [Propone│
│ ⭐ 4.5                          $41,500]│
│                                         │
│     [Aceptar esta oferta]              │
└─────────────────────────────────────────┘
```

**¿Qué se ve?**
- Avatar del conductor
- Nombre del conductor
- Calificación ⭐
- **"Propone"** = conductor envió precio diferente
- **"Acepta precio"** = conductor acepta el precio actual del pasajero
- Precio propuesto o precio actual
- **Botón "Aceptar esta oferta"** → Confirma viaje

### Sección 4: Cuando Acepta una Oferta

```
┌─────────────────────────────────────────┐
│ ✅ Viaje confirmado                     │
│                                         │
│ [Avatar] Juan Carlos                    │
│ ⭐ 4.8                                  │
│                                         │
│ Precio acordado: $42,000                │
└─────────────────────────────────────────┘
```

**Alert de confirmación:**
```
¿Aceptas esta oferta?

[Cancelar]  [Aceptar]
```

Después de aceptar:
```
Toast: "¡Viaje confirmado! El conductor te contactará."
↓
Cierra pantalla automáticamente después 1.5 segundos
```

---

## 🔄 Flujo Completo: Negociación Paso a Paso

### Escenario: Pasajero publica solicitud a Aeropuerto

```
1. PASAJERO PUBLICA
   └─ Origen: Cali
   └─ Destino: Aeropuerto
   └─ Precio inicial: $50,000

2. CONDUCTORES VEN LA SOLICITUD
   └─ Van a "Solicitudes de Pasajeros"
   └─ Ven: "Cali → Aeropuerto, $50,000, 2 pasajeros"

3. CONDUCTOR HACE OFERTA
   ├─ Opción A: "Acepto el precio" → Envía oferta sin cambiar precio
   └─ Opción B: "Hago contraoferta" → Propone $45,000

4. PASAJERO VE LA OFERTA EN DETALLES
   ├─ Ve lista de propuestas
   ├─ Si conductor propuso $45,000 → "Propone $45,000"
   ├─ Si conductor aceptó → "Acepta precio $50,000"
   └─ Botón "Aceptar esta oferta"

5. PASAJERO PUEDE:
   ├─ OPCIÓN A: "Subir oferta" → Contraoferta a $48,000
   │  └─ Conductores ven el cambio al instante
   │  └─ Pueden hacer nueva oferta
   └─ OPCIÓN B: "Aceptar esta oferta" directamente
      └─ Viaje confirmado
      └─ Se rechaza todas las otras ofertas automáticamente
```

---

## 📲 Acciones Disponibles para el Pasajero

| Acción | Dónde | Resultado |
|--------|-------|-----------|
| **Ver solicitudes** | AirportRequestScreen | Lista de todas |
| **Ver detalles** | Tap en solicitud | Va a AirportRequestDetailsScreen |
| **Ver ofertas** | En detalles | Sección "Propuestas de conductores" |
| **Hacer contraoferta** | Botón "Subir oferta" | Pide nuevo precio, conductores lo ven al instante |
| **Aceptar oferta** | Botón "Aceptar esta oferta" | Confirma viaje, se rechaza otras ofertas |
| **Cambiar de opinión** | Antes de aceptar | Puede hacer más contraofertas |
| **Cancelar solicitud** | Botón "Cancelar solicitud" | Todos los conductores dejan de verla |

---

## 💻 Componentes Principales

**File:** `src/screens/AirportRequestDetailsScreen.tsx`

**Hooks utilizados:**
```typescript
const {
  requests,           // Lista de solicitudes del pasajero
  offers,             // Lista de ofertas recibidas
  loading,            // Indica si está cargando
  error,              // Errores
  loadOffersForRequest,   // Obtiene ofertas para esta solicitud
  updateRequestPrice,     // Sube precio (contrapropuesta)
  acceptOffer,            // Acepta una oferta
  cancelRequest,          // Cancela la solicitud
} = useAirportNegotiation()
```

**Estados de ofertas:**
```typescript
const pendingOffers = offers.filter(o => o.status === 'pending')    // En negociación
const acceptedOffer = offers.find(o => o.status === 'accepted')    // Confirmada
const rejectedOffers = offers.filter(o => o.status === 'rejected')  // Rechazadas
```

---

## 🔐 Datos que se Sincroniza

**Campo: `proposed_price` en `airport_offers`**
- Si es `NULL` → Conductor acepta precio actual
- Si tiene valor → Conductor propone ese precio

**Campo: `offered_price` en `airport_requests`**
- Se actualiza cuando pasajero hace contraoferta
- Se actualiza cuando pasajero acepta una oferta
- Conductores ven cambios en tiempo real

---

## ⚠️ Casos Especiales

### Conductor propone $42,000 pero pasajero quería $40,000
```
Pasajero ve: "Propone $42,000"
Pasajero acción: "Subir oferta" → Baja a $41,000
Conductor ve: Precio actualizado a $41,000 al instante
```

### Múltiples conductores ofertan
```
Pasajero ve: 3 ofertas en lista
- Juan: $42,000
- María: $45,000
- Pedro: $41,500

Pasajero elige: María ($45,000)
Resultado: Las ofertas de Juan y Pedro se rechazan automáticamente
```

### Pasajero se arrepiente
```
Pasajero aceptó: Viaje confirmado
Problema: ¿Quiere cancelar?

Solución actual: 
❌ No hay botón de cancelación después de aceptar
✅ Debe contactar al conductor directamente

TODO: Agregar opción "Cancelar viaje" con penalización o justificación
```

---

## 🚀 Lo que falta implementar

1. **Chat en tiempo real** después de aceptar
2. **Rastreo de ubicación** del conductor
3. **Cancelación de viaje** después de aceptar (con razón)
4. **Calificación** después de completar viaje
5. **Sistema de notificaciones** cuando hay nueva oferta
