# 🚀 INSTRUCCIONES PRÁCTICAS: Ejecutar en Supabase Ahora

## 1️⃣ Crear Tabla en Base de Datos (5 min)

### Paso 1: Abre Supabase Dashboard
https://supabase.com → Tu proyecto → SQL Editor

### Paso 2: Copiar y ejecutar SQL

Abre el archivo **`DRIVER_DOCUMENTS_SETUP.sql`** (que se creó en la raíz del proyecto)

Copia TODO el contenido y pégalo en SQL Editor de Supabase

Haz clic en "Run" (o Ctrl+Enter)

✅ **Resultado**: Tabla `driver_documents` creada con índices y políticas RLS

---

## 2️⃣ Crear Storage Bucket (3 min)

### Paso 1: En Supabase Dashboard
- Ir a **Storage** en el menú izquierdo
- Botón **"New Bucket"**

### Paso 2: Configuración
```
Name: driver-documents
Privacy: PRIVATE (no public)
```

### Paso 3: Agregar RLS Policies
Después de crear el bucket, haz clic en **"Policies"** en la esquina superior derecha

**Policy 1 - Upload (INSERT)**
```sql
CREATE POLICY "Users can upload to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 2 - Download (SELECT)**
```sql
CREATE POLICY "Users can view their files"
ON storage.objects  
FOR SELECT
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

✅ **Resultado**: Bucket seguro donde solo los usuarios pueden ver/subir sus archivos

---

## 3️⃣ Probar en tu App Ahora (10 min)

### Paso 1: Cargar app en Expo
- App debe estar corriendo en Expo (Metro Bundler en puerto 8089)
- Escanea QR con Expo Go o abre en simulador

### Paso 2: Como conductor, sube un documento
1. Perfil → Documentos
2. Clic en cualquier botón (ej: Cédula)
3. Selecciona una foto del teléfono
4. Confirma la subida

### Paso 3: Verifica en Supabase que se guardó
1. En Supabase → Storage → driver-documents
2. Debe aparecer carpeta con tu user ID
3. Dentro: archivo con tu foto

2. En Supabase → SQL Editor
   ```sql
   SELECT * FROM driver_documents 
   WHERE driver_id = 'tu_user_id';
   ```
   Debe mostrar un registro con `status = 'pending'`

---

## 4️⃣ Simular Aprobación/Rechazo (5 min)

### Simular APROBACIÓN ✅

En Supabase → SQL Editor, copia y ejecuta esto (reemplaza el user_id):

```sql
UPDATE driver_documents
SET 
  status = 'verified',
  verified_at = NOW()
WHERE 
  driver_id = 'TU_USER_ID_AQUI'
  AND document_type = 'cedula';
```

**Luego en tu app**:
- Cierra y abre la app (o presiona R en Metro para recargar)
- Ve a Documentos
- Debe mostrar "✓ Verificado" en lugar de "Pendiente"

### Simular RECHAZO ❌

En Supabase → SQL Editor:

```sql
UPDATE driver_documents
SET 
  status = 'rejected',
  rejection_reason = 'La imagen está muy oscura. Por favor, toma una foto más clara en lugar iluminado.'
WHERE 
  driver_id = 'TU_USER_ID_AQUI'
  AND document_type = 'cedula';
```

**Luego en tu app**:
- Recarga la app
- Debe mostrar "⚠️ Rechazado"
- Debajo: el mensaje "La imagen está muy oscura..."
- El botón de subir debe reaparecer

---

## 5️⃣ Encontrar tu User ID (1 min)

Si necesitas tu User ID:

### Opción A: Desde Supabase Auth
1. Supabase Dashboard → Authentication
2. Tabla de usuarios
3. Copia el UUID (primera columna)

### Opción B: Desde Docker local
Si usesSpacebase localmente con Docker:
```bash
supabase db query -- SELECT id FROM profiles LIMIT 1;
```

### Opción C: Desde SQL Query
```sql
SELECT * FROM profiles LIMIT 1;
```

---

## 6️⃣ Checklist de Prueba Completa

- [ ] Tabla `driver_documents` creada en Supabase
- [ ] Bucket `driver-documents` creado
- [ ] RLS Policies agregadas al bucket
- [ ] App abierta en Expo
- [ ] Puedo subir documento desde app
- [ ] Archivo aparece en Storage → driver-documents
- [ ] Record aparece en tabla con `status = 'pending'`
- [ ] Puedo cambiar status a `'verified'` y app lo muestra
- [ ] Puedo cambiar status a `'rejected'` con razón
- [ ] App muestra rechazo con el motivo

---

## 7️⃣ Datos de Prueba para SQL

Si quieres probar manualmente créando registros:

```sql
-- Insertar documento de prueba
INSERT INTO driver_documents (
  driver_id,
  document_type,
  file_path,
  file_name,
  file_size,
  file_type,
  status,
  uploaded_at
) VALUES (
  'USER_UUID_AQUI',
  'cedula',
  'drivers/USER_UUID_AQUI/cedula/1712500000-test.jpg',
  'cedula_test.jpg',
  2048576,
  'image/jpeg',
  'pending',
  NOW()
);

-- Verificar que se insertó
SELECT * FROM driver_documents WHERE driver_id = 'USER_UUID_AQUI';
```

---

## 8️⃣ Troubleshooting

### Error: "No se puede subir documento"
**Causa**: RLS policies no están configuradas correctamente
**Solución**: Verificar que las policies en Storage bucket estén creadas

### Error: "Tabla no existe"  
**Causa**: No ejecutaste el SQL
**Solución**: Ejecutar `DRIVER_DOCUMENTS_SETUP.sql` nuevamente

### Documento se queda en "pending" 
**Causa**: No hay aprobación manual aún (es normal)
**Solución**: Ejecutar UPDATE desde SQL Editor para cambiar status

### No aparece la carpeta en Storage
**Causa**: Aún no hay intentos de subida o bucket privado
**Solución**: Subir un documento primero desde la app

---

## 9️⃣ Próximos Pasos Después de Probar

1. **Admin Dashboard** (Recompensado importante)
   - Crear pantalla para ver documentos pendientes
   - Botones para Aprobar/Rechazar
   - Campo para ingresar razón del rechazo

2. **Notificaciones** (Importante)
   - Push notification cuando se aprueba
   - Email cuando se rechaza con razón del rechazo

3. **Verificación Automática** (Opcional)
   - Integrar OCR para validar documentos
   - Usar Google Vision API, AWS Rekognition, etc.

---

## 🔟 Comandos Rápidos SQL

Copiar y ejecutar en SQL Editor según necesites:

**Ver todos los documentos pendientes**:
```sql
SELECT id, driver_id, document_type, uploaded_at 
FROM driver_documents 
WHERE status = 'pending'
ORDER BY uploaded_at DESC;
```

**Ver rechazados**:
```sql
SELECT id, driver_id, document_type, rejection_reason 
FROM driver_documents 
WHERE status = 'rejected';
```

**Ver aprobados**:
```sql
SELECT id, driver_id, document_type, verified_at 
FROM driver_documents 
WHERE status = 'verified';
```

**Ver todos los de un usuario**:
```sql
SELECT * FROM driver_documents 
WHERE driver_id = 'USER_UUID'
ORDER BY uploaded_at DESC;
```

**Eliminar documento (si necesita eliminar)**:
```sql
DELETE FROM driver_documents 
WHERE id = 'DOCUMENT_UUID';
-- Nota: También eliminar archivo de Storage manualmente
```

**Cambiar todos a pending (reset para testing)**:
```sql
UPDATE driver_documents 
SET status = 'pending' 
WHERE driver_id = 'USER_UUID';
```

---

## 📞 Dudas Frecuentes

**P: ¿Se borra el archivo si lo rechazo?**
A: No, el archivo se mantiene. El usuario puede subir una nueva versión (reemplazará la anterior)

**P: ¿Dónde descargo los documentos para revisar?**
A: Storage en el panel de Supabase. O puedes agregar un endpoint en tu backend.

**P: ¿Puedo hacer esto más automático?**
A: Sí, con Supabase Edge Functions o integrando OCR APIs

**P: ¿Se notifica al usuario?**
A: Actualmente no, necesitas implementar push notifications

---

## ✅ LISTO

Todo está implementado y listo para usar. Sigue los pasos 1-5 y tu sistema de documentos estará completamente funcional con verificación real.
