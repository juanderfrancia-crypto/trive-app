# ⚡ QUICK START: Verificación de Documentos en 5 Pasos

## 🎯 Tu Meta Hoy
Implementar verificación real de documentos para evitar fraudes.

## ✅ Lo que ya está listo en la App
- ✓ File picker (seleccionar archivos)
- ✓ Validación (tipo, tamaño)
- ✓ Upload a Supabase Storage
- ✓ Estados dinámicos (pending, verified, rejected)
- ✓ UI mejorada con rechazo y razones

---

## 🚀 5 PASOS PARA TERMINAR HOY

### PASO 1: Abre Supabase Dashboard (1 min)
```
https://supabase.com/dashboard
→ Tu proyecto
```

### PASO 2: Crea la Tabla (2 min)
```
→ SQL Editor (arriba a la derecha)
→ Nuevo query
→ Copia TODO el contenido de: DRIVER_DOCUMENTS_SETUP.sql
→ Pega en SQL Editor
→ Presiona "Run" (Ctrl+Enter)

✅ Tabla creada
```

### PASO 3: Crea el Storage Bucket (3 min)
```
→ Storage (menú izquierdo)
→ "New Bucket"
  Nombre: driver-documents
  Privado (selecciona)
→ Create bucket

✅ Bucket creado
```

### PASO 4: Agrega RLS Policies al Bucket (2 min)
En el bucket "driver-documents", arriba a la derecha → "Policies"

**Copia y ejecuta estos dos comandos:**

**Comando 1 - Upload:**
```sql
CREATE POLICY "Users can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Comando 2 - Download:**
```sql
CREATE POLICY "Users can view"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

✅ Métodos de seguridad agregados

### PASO 5: Prueba en tu App (5 min)
```
1. Abre la app (Expo Go)
2. Inicia sesión como conductor
3. Perfil → Documentos
4. Sube una foto a Cédula
   - Selecciona archivo
   - Presiona "Confirmar"
   - Debe decir "⏳ Pendiente de Revisión"

5. Verifica en Supabase que se guardó:
   → Storage → driver-documents
   → Debe aparecer carpeta con tu ID
   → Dentro: tu foto

6. Verifica en BD:
   → SQL Editor
   → Nuevo query:
   ```sql
   SELECT * FROM driver_documents 
   WHERE document_type = 'cedula' 
   LIMIT 1;
   ```
   → Ejecuta
   → Debe mostrar tu documento con status = 'pending'

✅ Sistema funcionando
```

---

## 🎮 Testing Manual

### Test 1: Simular APROBACIÓN ✓
```sql
-- Copia esto en SQL Editor
UPDATE driver_documents
SET status = 'verified', verified_at = NOW()
WHERE document_type = 'cedula'
LIMIT 1;
```
Ejecuta → Recarga tu app → Debe mostrar "✓ Verificado"

### Test 2: Simular RECHAZO ❌
```sql
UPDATE driver_documents
SET status = 'rejected', 
    rejection_reason = 'La foto está borrosa'
WHERE document_type = 'cedula'
LIMIT 1;
```
Ejecuta → Recarga tu app → Debe mostrar "Rechazado: La foto está borrosa"

### Test 3: Subir Múltiples Documentos
Prueba subiendo cada tipo:
- [ ] Cédula
- [ ] Licencia
- [ ] SOAT
- [ ] Tecnomecánica
- [ ] Antecedentes

Todos deben quedar en "Pendiente"

---

## 🔍 Troubleshoot Rápido

| Problema | Solución |
|----------|----------|
| "No puedo subir" | Verifica que Storage bucket esté creado |
| "Se queda en pending" | Normal, esperando aprobación manual |
| "El archivo no aparece" | Verifica que el bucket tenga RLS policies |
| "Error de BD" | Ejecuta de nuevo DRIVER_DOCUMENTS_SETUP.sql |

---

## 📊 Ahora que Funciona: ¿Qué Sigue?

### 🔴 CRÍTICO (Haz hoy)
- Implementar admin dashboard para revisar documentos

### 🟠 IMPORTANTE (Próximos 2-3 días)
- Push notifications cuando se aprueba/rechaza
- Email con razón de rechazo

### 🟡 OPCIONAL (Semana próxima)
- OCR para validar documentos automáticamente
- Face recognition para verificar identidad

---

## 📁 Documentos de Referencia

Si necesitas más ayuda, lee:
1. **PROBLEMA_Y_SOLUCION_DOCUMENTOS.md** - Entiende el problema
2. **INSTRUCCIONES_SUPABASE_PASO_A_PASO.md** - Pasos detallados
3. **DOCUMENT_VERIFICATION_GUIDE.md** - Referencia completa

---

## 💻 Comandos Útiles SQL

**Ver todos los documentos pendientes:**
```sql
SELECT driver_id, document_type FROM driver_documents 
WHERE status = 'pending';
```

**Ver un documento específico:**
```sql
SELECT * FROM driver_documents
WHERE document_type = 'cedula'
LIMIT 1;
```

**Contar documentos por estado:**
```sql
SELECT status, COUNT(*) as cantidad
FROM driver_documents
GROUP BY status;
```

---

## ✨ Resultado Final Esperado

Cuando abras la app y subas un documento:

```
ANTES (❌ Riesgoso)
┌─────────────────┐
│ Cédula          │
│ ✓ Verificado    │  ← Inmediato, sin validación
└─────────────────┘

AHORA (✅ Seguro)
┌─────────────────┐
│ Cédula          │
│ ⏳ Pendiente    │  ← Espera aprobación
└─────────────────┘
     ↓
┌─────────────────┐
│ Cédula          │
│ ✓ Verificado    │  ← Solo después de revisar
└─────────────────┘
```

---

## 🎉 ¡Listo!

Tu sistema de documentos ahora es **seguro, auditable y profesional.**

**Tiempo total:** 15 minutos
**Dificultad:** Fácil (copy-paste)
**Riesgo:** Bajo (sin cambios en producción)

Cualquier duda, revisa los archivos de guías incluidos.
