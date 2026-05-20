# Panel de Verificación Manual de Documentos - Guía de Implementación ✅

## 📋 Resumen Rápido

Se ha implementado un **panel de administrador totalmente funcional** para verificar documentos de conductores de forma manual.

### ¿Qué se creó?
1. ✅ **Pantalla AdminDocumentsScreen** - Panel visual para admins
2. ✅ **Funciones backend** - `approveDocument()` y `rejectDocument()`
3. ✅ **SQL de configuración** - Campos de admin y RLS policies
4. ✅ **Tabla de auditoría** - Registro de todas las acciones de verificación
5. ✅ **Integración navegación** - Ruta accesible en la app
6. ✅ **Login por Email** - Ahora puedes iniciar sesión con email/password ADEMÁS de teléfono

---

## 🚀 Pasos para Implementar

### **PASO 0: Habilitar Login por Email en Supabase** ✨

**Ahora puedes crear admins que inician con email/password!**

1. Ve a tu dashboard de Supabase
2. **Authentication → Providers**
3. Busca **"Email"** y habilítalo
4. Elige: **Email/Password** (recomendado)
5. Click **"Save"**

Ahora en la app verás dos tabs: "Por Teléfono" y "Por Email"

### **PASO 1: Ejecutar SQL en Supabase**

1. Ve a tu dashboard de Supabase
2. SQL Editor → New Query
3. Copia todo el contenido de `ADMIN_DOCUMENTS_SETUP.sql`
4. Pega en el SQL Editor y ejecuta (**Ctrl+Enter**)

```bash
# El SQL hará:
- Agregar columna is_admin a profiles
- Crear tablas admin_actions
- Actualizar RLS policies
- Crear índices
```

### **PASO 2: Convertir un Usuario a Admin**

**Opción A: Crear usuario nuevo (ahora es más fácil)**
```
1. En Supabase: Authentication → Users
2. Click "Invite user" o en la app: Click Register → Por Email
3. Email: admin@trive.test
4. Password: AdminTest123
5. Usuario creado → Te da su ID
6. Ejecuta este SQL:

UPDATE profiles SET is_admin = TRUE 
WHERE id = 'AQUI-VA-EL-USER-ID-DEL-NUEVO-ADMIN';
```

**Opción B: Usar usuario existente**
```sql
-- En Supabase SQL Editor:
UPDATE profiles SET is_admin = TRUE 
WHERE id = 'AQUI-VA-EL-USER-ID-EXISTENTE';
```

### **PASO 3: Probador Local**

En tu app:
1. Haz login como el usuario admin
2. Desde el menú o settings, navega a "Admin Documents"
3. Verás lista de documentos **pendientes**
4. Toca un documento para ver vista previa
5. Botones: **Aprobar** o **Rechazar**

---

## 📱 Flujo de Usuario (Admin)

### Vista Lista
```
┌─────────────────────────────┐
│   Verificación de Documentos│
│   5 pendientes de revisar   │
├─────────────────────────────┤
│ 📄 Cédula de Ciudadanía     │
│ 👤 Juan Pérez              │
│ ⏳ Pendiente                │
│ 📅 2025-04-07 14:30        │
│                             │
│ [Rechazar] [Aprobar]  ← Tap│
├─────────────────────────────┤
│ 📄 Licencia de Conducción   │
│ 👤 María García             │
│ ⏳ Pendiente                │
```

### Vista Detalle (Al tocar documento)
```
┌─────────────────────────────┐
│ ← Cédula de Ciudadanía      │
├─────────────────────────────┤
│                             │
│   [Vista Previa del Doc]    │ ← Imagen/PDF
│   (Tappable - abre grande)  │
│                             │
├─────────────────────────────┤
│ Conductor: Juan Pérez        │
│ Archivo: cedula_photo.jpg    │
│ Tamaño: 2.5 MB              │
│ Subido: 07 abr 2025 14:30   │
│                             │
│ [Rechazar] [Aprobar]        │
└─────────────────────────────┘
```

### Modal de Rechazo
```
┌──────────────────────────────┐
│  Razón del Rechazo           │
│  (El conductor verá esto)    │
├──────────────────────────────┤
│ ┌────────────────────────┐   │
│ │ La imagen está muy     │   │
│ │ borrosa, no se ve      │   │
│ │ claramente el texto    │   │
│ └────────────────────────┘   │
│ 45/200 caracteres            │
│                              │
│ [Cancelar] [Rechazar Documento]
└──────────────────────────────┘
```

---

## 🔧 Funciones Disponibles

### En `src/services/driverDocuments.ts`

#### 1️⃣ `getPendingDocumentsForVerification()`
```typescript
// Obtiene todos los documentos pendientes
try {
  const pendingDocs = await getPendingDocumentsForVerification();
  console.log(pendingDocs); // Array de documentos con driver_name
} catch (error) {
  console.error('Error:', error);
  // Solo admins pueden acceder
}
```

#### 2️⃣ `approveDocument(documentId, expiryDate?)`
```typescript
// Aprueba un documento
try {
  await approveDocument(
    'doc-123',
    '2026-12-31' // Opcional: fecha de vencimiento
  );
  // ✅ Documento aprobado
  // 💾 Registrado en admin_actions
  // 📨 TODO: Notificación al conductor
} catch (error) {
  console.error('Error:', error);
}
```

#### 3️⃣ `rejectDocument(documentId, rejectionReason)`
```typescript
// Rechaza un documento con razón
try {
  await rejectDocument(
    'doc-123',
    'La cédula está vencida, renovar por favor'
  );
  // ✅ Documento rechazado
  // 💾 Razón guardada en BD
  // 💾 Registrado en admin_actions
  // 📨 TODO: Notificación al conductor
} catch (error) {
  console.error('Error:', error);
}
```

---

## 📊 Estructura de Datos

### Tabla `driver_documents`
```
id              UUID (PK)
driver_id       UUID (FK → profiles)
document_type   VARCHAR - cedula, licencia, soat, etc
file_path       VARCHAR - drivers/{id}/{type}/{file}
file_name       VARCHAR - cedula_photo.jpg
file_size       INT - tamaño en bytes
file_type       VARCHAR - image/jpeg, application/pdf
status          VARCHAR - pending / verifying / verified / rejected
rejection_reason TEXT - "Imagen borrosa, no se ve el texto"
uploaded_at     TIMESTAMP - cuándo subió
verified_at     TIMESTAMP - cuándo fue aprobado
expiry_date     DATE - fecha de vencimiento (opcional)
```

### Tabla `admin_actions` (Auditoría)
```
id              UUID (PK)
admin_id        UUID (FK → profiles)
action          VARCHAR - 'approved' o 'rejected'
document_id     UUID (FK → driver_documents)
reason          TEXT - razón si fue rechazado
created_at      TIMESTAMP - cuándo hizo la acción
```

### Tabla `profiles` (Actualizada)
```
...campos existentes...
is_admin        BOOLEAN DEFAULT FALSE ← NUEVO
```

---

## 🔐 RLS Policies (Seguridad)

### Conductores pueden:
- ✅ Ver sus propios documentos
- ✅ Subir documentos
- ✅ Ver estado (pendiente/aprobado/rechazado)
- ❌ NO pueden aprobar/rechazar

### Admins pueden:
- ✅ Ver TODOS los documentos
- ✅ Aprobar documentos
- ✅ Rechazar documentos
- ✅ Ver razones de rechazo
- ❌ Usuarios normales NO ven esta opción

---

## 🧪 Prueba Rápida

### Test 1: Verificar que eres admin

```typescript
// En tu console / hook personalizado
import { supabase } from '../services/supabase';

async function testAdminAccess() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  
  console.log('¿Soy admin?', profile?.is_admin); // false o true
}
```

### Test 2: Cargar documentos pendientes

```typescript
import { getPendingDocumentsForVerification } from '../services/driverDocuments';

async function testPendingDocs() {
  try {
    const docs = await getPendingDocumentsForVerification();
    console.log('Documentos pendientes:', docs);
  } catch (error) {
    console.error('Error:', error.message);
    // Si says "No tienes permiso" → no eres admin
  }
}
```

---

## 📝 Estado del Documento (para el conductor)

Después de que un admin verifica, el conductor ve en su pantalla:

### ✅ Aprobado
```
[✓] Cédula de Ciudadanía
    Estado: Verificado ✓
    Aprobado el: 7 abr 2025
```

### ❌ Rechazado
```
[!] Cédula de Ciudadanía
    Estado: Rechazado
    Razón: "La imagen está muy borrosa"
    [Resubir Documento]  ← Botón reaparece
```

### ⏳ Pendiente
```
[⏱] Cédula de Ciudadanía
    Estado: Pendiente de revisión
    (Sin botón, espera a que admin verifique)
```

---

## 🔄 Integración con Notificaciones (Próximo Paso)

Cuando implementes notificaciones push, agrega:

```typescript
// En approveDocument()
await sendPushNotification(driverId, {
  title: '✅ Documento Aprobado',
  body: '[documento] ha sido verificado exitosamente',
  data: { documentId, documentType }
});

// En rejectDocument()
await sendPushNotification(driverId, {
  title: '⚠️ Documento Rechazado',
  body: `${documentType}: ${rejectionReason}`,
  data: { documentId, documentType }
});
```

---

## 🚨 Troubleshooting

### Problema: "No tienes permiso para acceder a esta información"
**Solución**: 
1. Verifica que ejecutaste el SQL
2. Actualiza `is_admin = TRUE` para tu usuario
3. Cierra sesión y vuelve a iniciar

### Problema: No aparece la opción "Admin Documents"
**Solución**:
1. Verifica que `is_admin = TRUE` en tu perfil
2. Asegúrate de llevar la navegación actualizada
3. Haz rebuild de la app: `npm install` + `npx expo start --clear`

### Problema: Vista previa de documento no carga
**Solución**:
1. Verifica que el archivo está en Storage
2. Las RLS policies del bucket permiten lectura
3. El archivo tiene 10MB máximo

---

## ⭐ Próximos Pasos (Phase 2 - OCR Automático)

Cuando quieras escalar:

1. **Cloud Vision API** (Google)
   - Detecta tipo de documento automáticamente
   - Extrae datos: nombre, número, fecha vencimiento
   - Chat: `approveDocument()` con datos extraídos

2. **Notificaciones Inteligentes**
   - Notificar al conductor automáticamente
   - Link directo al documento rechazado

3. **Dashboard Mejorado**
   - Filtros: cedula, licencia, soat, etc
   - Búsqueda por conductor
   - Métricas: documentos/día, % aprobación

4. **Integración Email**
   - Email de bienvenida cuando se aprueba
   - Email con razón de rechazo

---

## ✅ Checklist de Implementación

- [ ] Ejecuté el SQL `ADMIN_DOCUMENTS_SETUP.sql`
- [ ] Marqué mi usuario como `is_admin = TRUE`
- [ ] Veo el screen AdminDocumentsScreen en la app
- [ ] Puedo ver documentos pendientes (si existen)
- [ ] Puedo aprobar un documento
- [ ] Puedo rechazar un documento con razón
- [ ] El conductor ve los cambios de estado

---

## 📞 Soporte

Si necesitas:
- Cambiar la lógica de aprobación
- Agregar más campos (expiry_date, etc)
- Integraciones OCR
- Notificaciones

**La arquitectura está lista para escalarse** sin cambios grandes. ¡Solo agrega las funciones que necesites!
