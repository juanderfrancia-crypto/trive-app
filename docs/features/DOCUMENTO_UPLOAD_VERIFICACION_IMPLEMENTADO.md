# Documento upload - Sistema de Verificación Implementado ✅

## ¿Qué cambió?

Ahora el sistema tiene **verificación real de documentos** en lugar de simular aprobación inmediata.

### Antes ❌
- Usuario sube documento → Inmediatamente marca como "Verificado"
- ⚠️ **RIESGO**: Cualquiera podía subir documentos falsos sin validación
- No hay lugar para almacenar archivos reales

### Ahora ✅
- Usuario sube documento → Marca como "**Pendiente de revisión**"
- Archivo se guarda en **Supabase Storage**
- Admin/Sistema verifica el documento
- Usuario ve estado actualizado: "Verificado", "En análisis" o "Rechazado"
- Si se rechaza, se muestra el motivo para subir nuevamente

## Estados del Documento

```
┌─────────────┐
│   PENDING   │  ← Usuario acaba de subir
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  VERIFYING  │  ← Admin está revisando
└──────┬──────┘
       │
       ├─→ ┌──────────┐
       │   │ VERIFIED │  ✅ Aprobado
       │   └──────────┘
       │
       └─→ ┌──────────┐
           │ REJECTED │  ❌ Rechazado (mostrar razón)
           └──────────┘
```

## Flujo Técnico

### En tu App
1. Usuario selecciona PDF o imagen
2. Se valida: tipo, tamaño (max 10MB), formato
3. Se envía a **Supabase Storage** → carpeta `driver-documents/`
4. Se crea registro en BD con estado `pending`
5. App recarga documents y muestra "Pendiente"

### En el Backend (TÚ lo haces)
1. Admin ve lista de documentos pendientes
2. Revisa y aprueba o rechaza
3. Se actualiza BD: `status = 'verified'` o `'rejected'`
4. Se envía notificación al conductor
5. App detecta cambio y actualiza estado automáticamente

## Archivos Nuevos

| Archivo | Propósito |
|---------|-----------|
| `src/services/driverDocuments.ts` | Funciones para upload, consulta y validación |
| `DRIVER_DOCUMENTS_SETUP.sql` | Schema de BD + Storage configuration |
| `DOCUMENT_VERIFICATION_GUIDE.md` | Guía completa de implementación backend |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/screens/DriverDocumentsScreen.tsx` | Integración real con BD, estados dinámicos, rechazo con razón |
| `package.json` | Agregadas: `expo-document-picker`, `expo-file-system` |

## Próximos Pasos (Implementación Backend)

### 1️⃣ Ejecutar SQL (5 min)
```bash
# En Supabase Dashboard → SQL Editor → Copiar y ejecutar:
DRIVER_DOCUMENTS_SETUP.sql
```

### 2️⃣ Crear Admin Dashboard (1-2 horas)
Panel donde admins puedan:
- Ver documentos pendientes
- Descargar / ver documento
- Botón "Aprobar" o "Rechazar"
- Si rechaza: especificar razón

### 3️⃣ Integrar Validación Automática (Opcional - 2-4 horas)
Usar OCR para validar:
- Google Vision API
- AWS Rekognition
- Cloudinary ML

### 4️⃣ Notificaciones (1-2 horas)
Enviar push/email cuando aprueban o rechazan

## Cómo Probar Ahora

### Test Local en tu App

1. **Subir documento**:
   - Abre la app como conductor
   - Ve a Perfil → Documentos
   - Haz clic en cualquier botón de subida
   - Selecciona una foto de prueba
   - Confirma

2. **Verificar que se guardó**:
   - Debe aparecer "Pendiente de revisión" (en lugar de "Verificado")
   - No debe haber botón para subir otro (necesita estar verificado primero o rechazado)

3. **Simular aprobación desde Supabase**:
   ```sql
   -- Abrir SQL Editor en Supabase Dashboard
   UPDATE driver_documents
   SET status = 'verified', verified_at = NOW()
   WHERE driver_id = 'TU_USER_ID' AND document_type = 'cedula';
   ```
   - Recarga la app (puedes usar el botón de refresco)
   - Debe cambiar a "Verificado ✓"

4. **Simular rechazo**:
   ```sql
   UPDATE driver_documents
   SET status = 'rejected', rejection_reason = 'La imagen está borrosa'
   WHERE driver_id = 'TU_USER_ID' AND document_type = 'cedula';
   ```
   - Recarga la app
   - Debe mostrar "Rechazado" con la razón en rojo
   - Botón de subida debe reaparecer para intentar de nuevo

## UI/UX Mejorada

### Documentos Verificados ✅
```
┌─────────────────────────────────────┐
│ Cédula de Ciudadanía                │
│ Identificación válida               │
│                                     │
│ ✓ Verificado  [checkmark icon]      │ ← Sin botón
└─────────────────────────────────────┘
```

### Documentos Pendientes ⏳
```
┌─────────────────────────────────────┐
│ Licencia de Conducción              │
│ Categoría B - Vigente               │
│                                     │
│ ⏱ Pendiente  [upload button]        │ ← Con botón subir
└─────────────────────────────────────┘
```

### En Análisis 🔄
```
┌─────────────────────────────────────┐
│ SOAT                                │
│ Seguro Obligatorio...               │
│                                     │
│ 📋 En análisis...                   │ ← Sin botón, spinner
└─────────────────────────────────────┘
```

### Rechazado ❌
```
┌─────────────────────────────────────┐
│ Tecnomecánica                       │
│ Revisión técnico-mecánica           │
│                                     │
│ ⚠ Rechazado  [upload button]        │ ← Con razón del rechazo
├─────────────────────────────────────┤
│ Documento Rechazado                 │
│ "La imagen está muy oscura"         │
│ Por favor, sube nuevamente          │
└─────────────────────────────────────┘
```

## Funciones Disponibles en App

### `uploadDriverDocument()`
```typescript
const uploadedDoc = await uploadDriverDocument(
  userId,
  'cedula',           // document_type
  fileUri,            // local path
  fileName,           // filename
  fileSize,           // bytes
  mimeType            // 'image/jpeg', etc
);
// Retorna: DriverDocument | null
```

### `getDriverDocuments()`
```typescript
const allDocs = await getDriverDocuments(userId);
// Retorna: DriverDocument[] con status actualizado
```

### `getDriverDocument()`
```typescript
const doc = await getDriverDocument(userId, 'licencia');
// Retorna único documento o null
```

## Seguridad Implementada

✅ **Cliente**:
- Validación de tipo (PDF, JPG, PNG, WebP)
- Validación de tamaño (max 10MB)
- Validación de MIME type
- Un documento por tipo

✅ **Backend SQL**:
- RLS policies: Solo el usuario ve sus docs
- Unique constraint: Un doc por tipo por usuario
- Soft delete posible

✅ **Backend recomendado**:
- Anti-malware scan
- OCR validation
- Face recognition
- Junta verdadera basándose en API responses

## Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| "Error al subir" | Storage bucket no existe | Crear `driver-documents` bucket en Supabase |
| "Error al guardar" | Tabla no existe | Ejecutar `DRIVER_DOCUMENTS_SETUP.sql` |
| "No aparece documento" | Permisos RLS | Verificar UNIQUE y policies en tabla |
| "Sigue en pending" | Backend no actualiza | Actualizar manualmente con SQL |

## Preguntas Frecuentes

**P: ¿Pueden subir documentos falsos?**
R: Sí, en esta etapa es responsabilidad del admin/backend verificar. Se recomienda integrar OCR.

**P: ¿Dónde se guardan los archivos?**
R: En Supabase Storage → bucket "driver-documents" → carpeta por usuario.

**P: ¿Puedo descargar los documentos para revisar?**
R: Sí, implementar URL pública temporal o descarga en admin panel.

**P: ¿Qué pasa con documentos expirados?**
R: Status almacena `expiry_date`. Backend puede actualizar periódicamente a status = 'expired'.

## Próximas Fases Recomendadas

1. **Admin Panel** (Crítico)
   - Interfaz para revisar documentos
   - Botones Aprobar/Rechazar
   - Descarga de archivo para inspección

2. **Verificación Automática** (Alta)
   - OCR para validar documento
   - Face recognition para verificar identidad
   - Detección de fraudes

3. **Notificaciones** (Mediana)
   - Push cuando se aprueba
   - Email cuando se rechaza con razón
   - SMS como backup

4. **Expiración** (Mediana)
   - Check periódico de fechas de vencimiento
   - Auto-rechazar expired docs
   - Notificación antes de vencer

5. **Auditoría** (Alta)
   - Historial de cambios de estado
   - Quién aprobó y cuándo
   - Razones de rechazo
   - Intentos de subida
