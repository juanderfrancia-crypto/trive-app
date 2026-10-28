# 🔧 ACCESO A SOLICITUDES DE AEROPUERTO - GUÍA COMPLETA

## ❌ PROBLEMA IDENTIFICADO
El pasajero no podía ver dónde negociar contraofertas de aeropuerto. Solo veía:
- Notificación de que se envió contraoferta
- Botón "Solicitar viaje" en el home
- **PERO**: No había forma fácil de acceder a las solicitudes en negociación

---

## ✅ SOLUCIÓN IMPLEMENTADA

Agregué un **botón en el ProfileScreen** llamado **"Solicitudes de Aeropuerto"**

### Cómo Acceder (Paso a Paso)

**1. Abre tu perfil**
```
Pestaña inferior → Perfil
```

**2. Desplázate hacia abajo en el perfil**
Verás tres botones grandes:
- Mis Viajes
- Mis Chats
- ✨ **Solicitudes de Aeropuerto** (NUEVO) ✨

**3. Presiona "Solicitudes de Aeropuerto"**
```
Te lleva a la pantalla donde puedes:
  ✅ Ver tus solicitudes activas
  ✅ Crear nuevas solicitudes
  ✅ Ver ofertas de conductores
  ✅ Hacer contraofertas
  ✅ Aceptar ofertas
```

---

## 📋 Pantallas en el Flujo

### **Pantalla 1: AirportRequestScreen**
**Ubicación:** Perfil → Solicitudes de Aeropuerto

Aquí ves:
```
┌─────────────────────────────────┐
│ Mis solicitudes activas         │
├─────────────────────────────────┤
│ Cali → Aeropuerto CLO ⏳       │
│ $50,000 • Hoy 3:30 PM          │
│ └──> TAP aquí para detalles    │
│                                 │
│ Centro → Unicentro ✅          │
│ $35,000 • Confirmada           │
└─────────────────────────────────┘

┌─ CREAR NUEVA SOLICITUD ─────────┐
│ [Aeropuerto] [Centro] [Otro]    │
│ Origen: _______________         │
│ Destino: _______________        │
│ Pasajeros: 1  [−] [+]           │
│ Precio: _______________         │
│ [PUBLICAR SOLICITUD]            │
└─────────────────────────────────┘
```

**Acciones:**
- Tap en una solicitud → va a detalles
- Crear nueva → llena el formulario y presiona "PUBLICAR"

---

### **Pantalla 2: AirportRequestDetailsScreen**
**Ubicación:** AirportRequestScreen → Tap en una solicitud

Aquí ves la **NEGOCIACIÓN EN TIEMPO REAL**:

```
┌─────────────────────────────────┐
│ Detalles de tu solicitud        │
├─────────────────────────────────┤
│ ORIGEN: Cali, Centro            │
│ DESTINO: Aeropuerto Alfonso B.  │
│ PASAJEROS: 2                    │
│ SALIDA: Hoy 3:30 PM             │
│                                 │
├─ PRECIO OFRECIDO ──────────────┤
│ Precio actual: $50,000          │
│ Publicado: $45,000              │
│        [📝 SUBIR OFERTA] ← TÚ   │
│                                 │
├─ PROPUESTAS DE CONDUCTORES ────┤
│ (Los conductores hacen ofertas) │
│                                 │
│ 👤 Juan Carlos ⭐ 4.8          │
│    Propone $42,000 ← CONDUCTOR  │
│    [✅ ACEPTAR ESTA OFERTA]    │
│                                 │
│ 👤 María López ⭐ 4.9          │
│    Acepta precio $50,000        │
│    [✅ ACEPTAR ESTA OFERTA]    │
│                                 │
│ 👤 Pedro García ⭐ 4.5         │
│    Propone $41,500              │
│    [✅ ACEPTAR ESTA OFERTA]    │
└─────────────────────────────────┘
```

---

## 🔄 Ejemplo de Negociación Completa

### **Día 1: Tú publicas**
```
1. Publicas: Cali → Aeropuerto, $50,000, 2 pasajeros
2. Status: ⏳ Esperando ofertas
```

### **Día 1: Conductores ven y hacen ofertas (20 minutos después)**
```
Juan Carlos propone $42,000
María López acepta tu precio ($50,000)
Pedro García propone $41,500
```

### **Día 1: Tú ves las ofertas (notificación + en pantalla)**
```
Abres Perfil → Solicitudes de Aeropuerto
Ves las 3 ofertas:
- Juan: $42,000 (muy bajo)
- María: $50,000 (tu precio)
- Pedro: $41,500 (bajo)
```

### **Día 1: Tú haces contraoferta (opcional)**
```
Presionas [📝 SUBIR OFERTA]
Cambias a $48,000
Conductores lo ven al instante ⚡
```

### **Día 1: Conductores reaccionan**
```
Juan actualiza a $44,000
María desaparece (no quiso)
Pedro rechaza su oferta
```

### **Día 1: Tú aceptas una**
```
Presionas [✅ ACEPTAR ESTA OFERTA] en Juan
Alert: "¿Aceptas esta oferta?"
[Cancelar] [Aceptar]
Presionas Aceptar
↓
✅ VIAJE CONFIRMADO
Juan Carlos ⭐ 4.8
Precio acordado: $44,000
"El conductor te contactará"
↓
Cierra automáticamente después 1.5s
```

### **Resultado: Viaje Confirmado**
```
Ya no ves "Propuestas de conductores"
Ves "✅ Viaje confirmado"
Con info del conductor elegido
Las otras ofertas se rechazan automáticamente
```

---

## 🎯 Acciones Disponibles para Ti (Pasajero)

| Acción | Dónde | Qué pasa |
|--------|-------|---------|
| **Ver solicitudes activas** | AirportRequestScreen | Lista con todas tus solicitudes pendientes y confirmadas |
| **Crear solicitud** | AirportRequestScreen | Llena formulario y presiona "PUBLICAR" |
| **Ver ofertas recibidas** | AirportRequestDetailsScreen | Sección "Propuestas de conductores" |
| **Hacer contraoferta** | Botón "SUBIR OFERTA" | Conductores ven el cambio AL INSTANTE ⚡ |
| **Aceptar oferta** | Botón "ACEPTAR ESTA OFERTA" | Viaje confirmado, otros se rechazan |
| **Cambiar de opinión** | Antes de aceptar | Puedes hacer más contraofertas |
| **Cancelar solicitud** | Botón "CANCELAR SOLICITUD" | Todos los conductores dejan de verla |

---

## 🆘 Qué hacer si algo no funciona

### **"No veo el botón 'Solicitudes de Aeropuerto' en mi perfil"**
```
Solución: Actualiza la app o recarga el perfil
Pestaña Perfil → Desliza para refrescar
```

### **"Hice una solicitud pero no aparece"**
```
Solución: Recarga AirportRequestScreen
Vuelve atrás y entra nuevamente
```

### **"Veo notificación de oferta pero no la veo en la pantalla"**
```
Solución: Ve a Perfil → Solicitudes de Aeropuerto
Tap en la solicitud → Ver detalles
```

### **"No puedo hacer contraoferta"**
```
Probable causa: La solicitud no está en status 'pending'
Si ya está confirmada, no puedes hacer cambios
```

### **"Acepté una oferta pero sigo viendo otras"**
```
Solución: Cierra y abre nuevamente
O recarga la pantalla
```

---

## 💡 Tips Útiles

✅ **Sé estratégico con tu precio**
- Publica un poco más alto que lo que realmente quieres
- Haz contraofertas si los conductores piden muy poco

✅ **Verifica la reputación del conductor**
- ⭐ 4.5+ es bueno
- Mira cuántas calificaciones tiene

✅ **Acepta rápido si te gusta**
- Los conductores pueden retirar ofertas
- Si ves una buena, acepta

✅ **Usa "Cancelar solicitud" si cambiaste de planes**
- Los conductores dejarán de verla
- Evita que gastes dinero

---

## 📝 Campos de Solicitud

Cuando creas una solicitud, debes llenar:

| Campo | Ejemplo | Notas |
|-------|---------|-------|
| **Origen** | Cali, Centro | Tu ciudad/zona de salida |
| **Destino** | Aeropuerto CLO | Elige: Aeropuerto, Centro Cali, u Otro |
| **Pasajeros** | 2 | 1-8 personas |
| **Fecha** | 2026-06-15 | Formato AAAA-MM-DD |
| **Hora** | 14:30 | Formato HH:MM |
| **Precio** | 50000 | Tu oferta inicial en pesos |
| **Notas** | Tengo equipaje grande | Opcional, info para conductores |

---

## 🔐 Privacidad y Seguridad

✅ **Tu número no se comparte hasta aceptar**
- Los conductores solo ven tu nombre y rating
- El número se comparte cuando confirman el viaje

✅ **Las ofertas son privadas**
- Solo tú y cada conductor ven la oferta
- Otros conductores no ven la negociación

✅ **Puedes cancelar en cualquier momento**
- Antes de aceptar: cancela libremente
- Después de aceptar: contacta al conductor

---

## 📊 Status de Solicitudes

| Status | Significado | Acción |
|--------|------------|--------|
| **pending** ⏳ | Esperando ofertas | Ver ofertas, hacer contraofertas |
| **accepted** ✅ | Viaje confirmado | Esperar contacto del conductor |
| **completed** 🏁 | Viaje finalizado | Puedes calificar al conductor |
| **cancelled** ❌ | Solicitud cerrada | No se ve en lista activa |

---

## ¿Todavía no funciona?

Si después de seguir esta guía aún hay problemas:
1. Ve a Perfil → Centro de Ayuda
2. Reporta que no puedes acceder a "Solicitudes de Aeropuerto"
3. Describe exactamente qué ves y qué esperabas ver
