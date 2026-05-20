# 🔒 PROBLEMA RESUELTO: Documentos Falsos Sin Verificación

## El Problema Original

Cuando subías un SOAT (o cualquier documento), pasaba esto:

```
Usuario: "Voy a subir una foto cualquiera como SOAT"
           │
           ├─ Selecciona archivo → app valida tipo/tamaño ✓
           │
           └─ Presiona "Confirmar Subida"
                     │
                     └─ ¿QUÉ PASABA? ❌
                        • Se marcaba INMEDIATAMENTE como "Verificado"
                        • NO se almacenaba el archivo en ningún lado
                        • NO había nadie verificando que era legítimo
                        • Cualquiera podía tener un "SOAT verificado" falso
```

### Riesgos de Seguridad 🚨
- ✗ Conductores con documentos fake activadas
- ✗ Fraude en plataforma de transporte
- ✗ Responsabilidad legal para TRIVE
- ✗ Usuarios en riesgo con conductores no verificados

---

## La Solución Implementada

Ahora funciona así:

```
Usuario: "Subo mi SOAT legítimo"
           │
           ├─ Selecciona PDF/foto ✓
           │
           ├─ App valida tipo, tamaño (máx 10MB) ✓
           │
           └─ Presiona "Confirmar Subida"
                     │
                     ├─ 📤 Se sube a Supabase Storage
                     │   └─ drivers/{userId}/soat/1234567-soat.pdf
                     │
                     ├─ 💾 Se crea registro en BD
                     │   ├─ status: "pending" ⏳
                     │   ├─ file_path: ...
                     │   ├─ file_name: "soat.pdf"
                     │   ├─ file_size: 2.5MB
                     │   └─ uploaded_at: 2025-04-07 14:32
                     │
                     └─ 👤 App muestra: "Pendiente de Revisión"
                        └─ Sin botón de subir (necesita aprobación)

                              ↓

                        🔍 ADMIN/SISTEMA VERIFICA:
                        ├─ ¿Es un SOAT real?
                        ├─ ¿Está vigente?
                        ├─ ¿Pertenece al usuario?
                        └─ ¿No está alterado?

                              ↓

                        APROBADO ✅         o        RECHAZADO ❌
                        
status→"verified"                         status→"rejected"
verified_at→"2025-04-07"              rejection_reason→"Imagen borrosa"

App muestra: ✓ Verificado          App muestra: ⚠️ Rechazado
(sin botón)                         (botón subir reaparece)
                                    "La imagen está muy oscura"
```

---

## Flujo De Datos

```
┌─────────────────────────┐
│  APLICACIÓN MOBILE      │
│  (React Native)         │
└────────────┬────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌──────────────┐  ┌──────────────────┐
│ File Picker  │  │ Validación Local │
│              │  │ - Tipo           │
│ (PDF/image)  │  │ - Tamaño (10MB)  │
└──────────────┘  └──────────────────┘
     │                │
     └────────┬───────┘
              │
              ▼
     ┌─────────────────┐
     │ Supabase Upload │     ┌─────────────────────────┐
     │                 │────▶│ Storage (Privado)       │
     │ Base64 encoding │     │ drivers/{uid}/{type}/   │
     │ Multipart file  │     │                         │
     └─────────────────┘     └─────────────────────────┘
              │
              ├─────────────────┐
              │                 │
              ▼                 ▼
     ┌──────────────┐   ┌──────────────────┐
     │ Insert en BD │   │ Status: PENDING  │
     │ driver_      │   │                  │
     │ documents    │   │ Usuario ve:      │
     └──────────────┘   │ "Pendiente..."   │
                        └──────────────────┘

                              ↓

☁️  BACKEND/ADMIN (TÚ)
├─ Consulta documentos pendientes
├─ Descarga archivo para revisar
├─ Verifica autenticidad (OCR, manual, etc)
├─ Actualiza estado en BD:
│  UPDATE driver_documents 
│  SET status = 'verified|rejected'
│  WHERE id = '...'
└─ Notifica al usuario

                              ↓

     ┌──────────────────────┐
     │ APLICACIÓN RECARGA   │
     │ Lee status actualizado
     │ Muestra resultado    │
     │ (✓ Verificado o ❌)  │
     └──────────────────────┘
```

---

## Estados en la BD

```
🗄️ TABLA: driver_documents

┌──────────────────────────────────────────────────────────┐
│ id          | cedula_uuid_12345                         │
│ driver_id   | user_uuid_67890                           │
│ document_type | 'cedula'                                │
│ file_path   | 'drivers/user_uuid_67890/cedula/...'     │
│ file_name   | 'cedula_photo.jpg'                       │
│ file_size   | 1048576  (1MB)                           │
│ file_type   | 'image/jpeg'                             │
│ status      | 'pending' ⏳                              │
│ rejection_reason | NULL                                │
│ uploaded_at | 2025-04-07 14:15:00                      │
│ verified_at | NULL (aún no aprobado)                   │
│ updated_at  | 2025-04-07 14:15:00                      │
└──────────────────────────────────────────────────────────┘

    DESPUÉS DE APROBACIÓN:
    
┌──────────────────────────────────────────────────────────┐
│ status      | 'verified' ✅                              │
│ verified_at | 2025-04-07 14:32:00                      │
│ updated_at  | 2025-04-07 14:32:00                      │
└──────────────────────────────────────────────────────────┘

    O DESPUÉS DE RECHAZO:
    
┌──────────────────────────────────────────────────────────┐
│ status      | 'rejected' ❌                              │
│ rejection_reason | 'La foto está muy borrosa'          │
│ updated_at  | 2025-04-07 14:35:00                      │
│ verified_at | NULL (nunca fue aprobado)                │
└──────────────────────────────────────────────────────────┘
```

---

## Antes vs Después en la UI

### ANTES ❌ (RIESGOSO)
```
Cédula de Ciudadanía
═════════════════════════════════════════
Identificación válida

✓ Verificado    [Cloud icon - disabled]

❌ PROBLEMA: Se marcó como verificado
   sin que nadie lo haya revisado
```

### DESPUÉS ✅ (SEGURO)
```
Cédula de Ciudadanía
═════════════════════════════════════════
Identificación válida

⏳ Pendiente    [Cloud-upload icon]

✅ CORRECTO: Esperando revisión,
   usuario puede intentar subir de nuevo
```

### CUANDO SE APRUEBA ✅
```
Cédula de Ciudadanía
═════════════════════════════════════════
Identificación válida

✓ Verificado   [Checkmark - disabled]

✅ CORRECTO: Admin lo aprobó después
   de verificar que es legítimo
```

### CUANDO SE RECHAZA ❌
```
Cédula de Ciudadanía
═════════════════════════════════════════
Identificación válida

⚠️ Rechazado    [Cloud-upload icon]

📌 Documento Rechazado
   "La foto está demasiado oscura"
   Por favor, sube nuevamente

✅ CORRECTO: Se muestra la razón,
   usuario puede intentar de nuevo
```

---

## Validaciones Implementadas

### 🟢 CLIENTE (App Mobile)
```
1. Seleccionar archivo
   ├─ ¿Es PDF o imagen? ✓
   ├─ ¿Tamaño ≤ 10MB? ✓
   ├─ ¿MIME type válido? ✓
   └─ → Si pasa: subir a backend
       → Si falla: mostrar error

2. Confirmación antes de subir
   ├─ Mostrar nombre del archivo
   ├─ Mostrar tamaño
   └─ Botón "Confirmar Subida" o "Cancelar"
```

### 🟠 BACKEND (Recomendado)
```
1. Validación de seguridad
   ├─ ¿El usuario es conductor? ✓
   ├─ ¿El archivo es malware? (ClamAV)
   ├─ ¿La firma del archivo es válida? ✓
   └─ ¿Tiene contenido sospechoso? (ML)

2. Validación de documento
   ├─ ¿Es un documento real? (OCR)
   ├─ ¿El nombre/número está vigente? (DB)
   ├─ ¿Pertenece a este usuario? (Face rec)
   ├─ ¿La fecha de vencimiento es válida? ✓
   └─ ¿El documento no está editado? (Forensics)
```

---

## Cómo Funciona Ahora en Supabase

### 1. El Usuario Sube
```typescript
// Función en app (ya implementada):
const uploadedDoc = await uploadDriverDocument(
  userId,           // "user_abc123"
  'cedula',         // tipo de documento
  fileUri,          // "/storage/.../IMG_123.jpg"
  'cedula.jpg',     // nombre del archivo
  2048576,          // tamaño en bytes (2MB)
  'image/jpeg'      // MIME type
);

// Resultado: nuevo record en BD con
// status: 'pending'
// file_path: 'drivers/user_abc123/cedula/1712510400-cedula.jpg'
```

### 2. El Admin Verifica
```sql
-- Admin abre el archivo en carpeta drivers/ y lo inspecciona
-- Luego ejecuta (en Supabase console o admin panel):

-- Si APRUEBA:
UPDATE driver_documents
SET status = 'verified', 
    verified_at = NOW()
WHERE driver_id = 'user_abc123' 
  AND document_type = 'cedula';

-- Si RECHAZA:
UPDATE driver_documents
SET status = 'rejected',
    rejection_reason = 'La foto está muy borrosa. Por favor toma una más clara.'
WHERE driver_id = 'user_abc123'
  AND document_type = 'cedula';
```

### 3. La App Se Entera
```typescript
// La app automáticamente:
const docs = await getDriverDocuments(userId);
// Retorna el documento con
// status: 'verified' o 'rejected'

// La UI se actualiza automáticamente
// Muestra el nuevo estado (✓ o ❌)
```

---

## Seguridad de Datos

```
🔐 Storage (archivos)
├─ PRIVADO: No accesible por URL pública
├─ RLS: Solo el usuario puede ver sus archivos
├─ Ubicación: drivers/{userId}/{docType}/
└─ Nombre: No contiene info sensible (solo timestamp)

🔐 Base de Datos
├─ RLS: Solo el user ve sus propios records
├─ UNIQUE constraint: 1 documento por tipo
├─ Admin-only: Actualización de status
└─ Auditable: Timestamps de creación/cambio
```

---

## Siguiente Paso: Admin Panel

Para completar el sistema, necesitas crear un admin dashboard donde:

```
┌────────────────────────────────────────┐
│ 📋 ADMIN - DOCUMENTOS PENDIENTES       │
├────────────────────────────────────────┤
│                                        │
│ Juan Pérez - Cédula (1.2 MB)          │
│ Subido: 2025-04-07 14:15              │
│ [Ver PDF] [Aprobar] [Rechazar]        │
│                                        │
│ Maria García - Licencia (2.5 MB)      │
│ Subido: 2025-04-07 14:20              │
│ [Ver PDF] [Aprobar] [Rechazar]        │
│                                        │
│ Carlos Morales - SOAT (856 KB)        │
│ Subido: 2025-04-07 14:25              │
│ [Ver PDF] [Aprobar] [Rechazar]        │
│                                        │
└────────────────────────────────────────┘
```

Al hacer clic en "Aprobar" o "Rechazar", actualiza la BD y el usuario ve el cambio en su app.

---

## Resumen de Cambios

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Aprobación** | Inmediata | Después de revisión |
| **Almacenamiento** | Ninguno | Supabase Storage |
| **Validación** | Solo tipo/tamaño | Completa + backend |
| **Rechazo** | No existe | Con razón visible |
| **Intentos** | No aplica | Ilimitados si rechaza |
| **Seguridad** | ❌ Baja | ✅ Alta |
| **Fraude** | Posible | Prevenido |

---

## ¿Preguntas?

**P: ¿Dónde se guardan los archivos?**
A: En Supabase Storage → bucket "driver-documents" → carpeta por usuario

**P: ¿Pueden ver otros usuarios los documentos?**
A: No, RLS policies solo permiten que el usuario vea sus propios documentos

**P: ¿Se pierden los documentos si se rechazan?**
A: No, se guardan y el usuario puede subir una nueva versión

**P: ¿Notificaciones al ser aprobado/rechazado?**
A: Sí (implementar en admin panel - push notification + email)

**P: ¿Expiraciones de documentos?**
A: Sí (guardar expiry_date y hacer checks periódicos)
