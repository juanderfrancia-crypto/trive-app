# Sistema de Verificación de Documentos - Guía de Implementación

## 📋 Descripción General

El sistema de documentos ahora tiene un flujo correcto de validación para evitar fraudes:

1. **Usuario sube documento** → Estado: `pending`
2. **Backend almacena file** → En Supabase Storage
3. **Admin/Sistema verifica** → Manual o automático
4. **Usuario notificado** → Aprobado o rechazado

## 🔄 Estados del Documento

| Estado | Descripción | Acción |
|--------|------------|--------|
| `pending` | Esperando ser subido | Mostrar botón de subir |
| `verifying` | En proceso de verificación | Mostrar spinner, desactivar botón |
| `verified` | Aprobado y válido | Mostrar checkmark, desactivar botón |
| `rejected` | Rechazado con razón | Mostrar razón, permitir nuevo intento |

## 📁 Estructura de Almacenamiento

Los archivos se guardan en Supabase Storage con esta estructura:

```
driver-documents/
├── drivers/
│   ├── {user_id}/
│   │   ├── cedula/
│   │   │   ├── 1711234567-cedula_photo.jpg
│   │   ├── licencia/
│   │   │   ├── 1711234568-license.pdf
│   │   ├── soat/
│   │   ├── tecnomecanica/
│   │   └── antecedentes/
```

## 🗄️ Base de Datos

### Tabla: `driver_documents`

```sql
CREATE TABLE driver_documents (
  id UUID PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES profiles(id),
  document_type VARCHAR(50), -- 'cedula', 'licencia', 'soat', 'tecnomecanica', 'antecedentes'
  file_path VARCHAR(500), -- Path en Storage
  file_name VARCHAR(255),
  file_size INT, -- en bytes
  file_type VARCHAR(50), -- MIME type
  status VARCHAR(20), -- 'pending', 'verifying', 'verified', 'rejected'
  rejection_reason TEXT, -- Motivo del rechazo
  uploaded_at TIMESTAMP,
  verified_at TIMESTAMP, -- Cuando fue aprobado
  expiry_date DATE, -- Fecha de vencimiento
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(driver_id, document_type) -- Un doc por tipo
);
```

## 🛠️ Implementación Backend (Recomendado)

### Opción 1: Verificación Manual (Admin Dashboard)

```typescript
// En tu backend (Supabase Edge Functions o servidor Node)

// 1. Admin revisa documento
async function approveDocument(documentId: string, verifyerId: string) {
  const { error } = await supabase
    .from('driver_documents')
    .update({
      status: 'verified',
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  // 2. Notificar al conductor
  if (!error) {
    await sendNotification(driverId, {
      title: 'Documento Aprobado',
      body: 'Tu documento ha sido verificado exitosamente',
    });
  }
}

// 1. Admin rechaza documento con razón
async function rejectDocument(documentId: string, reason: string) {
  const { error } = await supabase
    .from('driver_documents')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  // 2. Notificar al conductor
  if (!error) {
    await sendNotification(driverId, {
      title: 'Documento Rechazado',
      body: `Tu ${documentType} fue rechazado: ${reason}`,
    });
  }
}
```

### Opción 2: Verificación Automática (OCR/ML)

```typescript
// Usar servicios como:
// - Google Vision API
// - AWS Rekognition
// - Azure Computer Vision
// - Cloudinary ML

async function verifyDocumentAutomated(documentPath: string, documentType: string) {
  // 1. Descargar imagen/PDF
  const fileBuffer = await downloadFromStorage(documentPath);
  
  // 2. Procesar con OCR
  const ocr = await googleVision.textDetection(fileBuffer);
  
  // 3. Validar
  const isValid = validateDocument(ocr.text, documentType);
  
  // 4. Actualizar estado
  const newStatus = isValid ? 'verified' : 'rejected';
  const reason = isValid ? null : 'No se pudo verificar autom\u00e1ticamente';
  
  return updateDocumentStatus(documentId, newStatus, reason);
}
```

## 📱 Flujo en la App

### En el Cliente (React Native)

1. Usuario selecciona archivo
2. Se valida localmente (tipo, tamaño)
3. Se sube a Supabase Storage
4. Se crea registro en `driver_documents` con estado `pending`
5. Se recarga lista cada X segundos para verificar cambios
6. Mostrar estado actualizado en tiempo real

```typescript
// Listening to document changes (realtime)
useEffect(() => {
  if (!user?.id) return;

  const subscription = supabase
    .from('driver_documents')
    .on('*', { event: '*', schema: 'public' }, (payload) => {
      if (payload.new?.driver_id === user.id) {
        // Recargar documento cambiado
        loadDocument(payload.new.document_type);
      }
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, [user?.id]);
```

## 🔒 Validaciones Recomendadas

### Validaciones del Cliente (App)
- ✅ Tipo de archivo (PDF, JPG, PNG, WebP)
- ✅ Tamaño máximo (10MB)
- ✅ Nombre de archivo válido
- ✅ No permitir documentos duplicados sin reemplazar el anterior

### Validaciones del Backend (Requeridas)
- ✅ Verificar que el usuario sea un conductor (`role = 'driver'`)
- ✅ Verificar que el archivo sea válido (signature de archivo)
- ✅ Anti-malware scan (usando ClamAV, etc)
- ✅ Verificar OCR: que el documento sea real
- ✅ Verificar fecha de vencimiento (si aplica)
- ✅ Verificar que sea un documento legítimo (no fotocopia, no alterado)
- ✅ Verificar que la foto sea del usuario (face recognition)

## 🔐 RLS Policies (Seguridad)

```sql
-- Drivers can view their own documents
CREATE POLICY "drivers_select_own"
  ON driver_documents FOR SELECT
  USING (driver_id = auth.uid());

-- Drivers can upload new documents
CREATE POLICY "drivers_insert_own"
  ON driver_documents FOR INSERT
  WITH CHECK (driver_id = auth.uid());

-- Drivers can update their own documents (upload new version)
CREATE POLICY "drivers_update_own"
  ON driver_documents FOR UPDATE
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Admins need special policy (if you have admin role)
-- CREATE POLICY "admins_full_access"
--   ON driver_documents
--   USING (auth.jwt() ->> 'role' = 'admin');
```

## 🚀 Pasos para Implementar

### 1. Ejecutar SQL en Supabase Dashboard

Copiar y pegar el contenido de `DRIVER_DOCUMENTS_SETUP.sql` en SQL Editor

### 2. Crear Storage Bucket

1. Ve a Storage en Supabase Dashboard
2. Crear nuevo bucket: `driver-documents`
3. Privado (no público)
4. Agregar RLS policies:

```sql
-- Authenticated users can upload to their folder
CREATE POLICY "Users can upload to their folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'driver-documents' AND auth.uid()::text = (string_to_array(name, '/'))[2]);

-- Authenticated users can view their files
CREATE POLICY "Users can view their files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'driver-documents' AND auth.uid()::text = (string_to_array(name, '/'))[2]);
```

### 3. Integrar en App (Ya Hecho ✅)

La carpeta `DriverDocumentsScreen.tsx` ya tiene:
- File picker funcionando
- Validación local
- Upload a Supabase
- Estados dinámicos mostrando `pending`, `verifying`, `verified`, `rejected`

### 4. Crear Admin Dashboard (Próximo Paso)

Crear pantalla para que admins puedan:
- Ver todos los documentos pendientes
- Aprobar / Rechazar con razón
- Ver historial de verificaciones

## 📊 Dashboard Admin (Código Ejemplo)

```typescript
// screens/AdminDocumentsScreen.tsx
export default function AdminDocumentsScreen() {
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [filter, setFilter] = useState<'pending' | 'verifying' | 'verified' | 'rejected'>('pending');

  useEffect(() => {
    loadDocuments(filter);
  }, [filter]);

  const loadDocuments = async (status: string) => {
    const { data } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('status', status)
      .order('uploaded_at', { ascending: false });

    setDocuments(data || []);
  };

  return (
    <FlatList
      data={documents}
      renderItem={({ item }) => (
        <DocumentAdminCard
          document={item}
          onApprove={() => approveDocument(item.id)}
          onReject={() => showRejectDialog(item.id)}
        />
      )}
    />
  );
}
```

## 🧪 Testing Manual

1. Inicia como conductor
2. Ve a Documentos
3. Sube un documento
4. Verifica que se ve "Pendiente"
5. Simula aprobación en Supabase:
   ```sql
   UPDATE driver_documents
   SET status = 'verified', verified_at = NOW()
   WHERE driver_id = 'tu_user_id' AND document_type = 'cedula';
   ```
6. Verifica que la app cambie a "Verificado"
7. Simula rechazo:
   ```sql
   UPDATE driver_documents
   SET status = 'rejected', rejection_reason = 'Imagen no clara'
   WHERE driver_id = 'tu_user_id' AND document_type = 'cedula';
   ```
8. Verifica que se muestre el rechazo con el motivo

## 🚨 Problemas Comunes

| Problema | Solución |
|----------|----------|
| "No puedo subir" | Verificar Storage bucket permisos RLS |
| "Documento queda en pending" | Verificar que backend está actualizando estado |
| "No recibo notificación" | Implementar push notifications backend |
| "Documento duplicado" | Por defecto, UNIQUE(driver_id, document_type) remplaza |

## 💡 Mejoras Futuras

- [ ] Notificaciones push cuando se aprueba/rechaza
- [ ] Email al conductor con razón del rechazo
- [ ] Expiración automática de documentos
- [ ] Descarga de documento para verificación manual
- [ ] Historial de cambios de estado
- [ ] Verificación con selfi (face recognition)
- [ ] Integración con APIs de validación de documentos reales
