# 🚀 GENERAR APK CON NOTIFICACIONES PUSH - PASO A PASO

**Fecha:** 17 de abril de 2026  
**Cambios principales:**
- ✅ Push notifications configuradas completamente
- ✅ Permiso POST_NOTIFICATIONS en Android 13+
- ✅ Trip preferences migration
- ✅ App.tsx inicializa notificaciones

---

## ⚠️ PREREQUISITO: Ejecutar Migration SQL

Antes de generar APK, ejecuta esta migration en Supabase:

### Paso 1: Abre Supabase SQL Editor
```
1. Ve a: https://supabase.com
2. Tu proyecto TRIVE
3. SQL Editor (lado izquierdo)
4. Click "New Query"
```

### Paso 2: Copiar y ejecutar SQL
```sql
-- Copiar TODO el contenido de MIGRATION_FIX_TRIP_PREFERENCES.sql
-- Pegarlo en Supabase SQL Editor
-- Click "Run" (Ctrl + Enter)
```

**Archivo:** `c:\Users\T460s\trive-app\MIGRATION_FIX_TRIP_PREFERENCES.sql`

**Resultado esperado:**
```
✅ Consulta ejecutada exitosamente
✅ Columnas agregadas a trip_preferences
```

---

## 🔨 PASO 1: Verificar cambios en código

Verificar que estos archivos fueron modificados:

```
✅ app.json - Agregado plugin de notificaciones + permiso POST_NOTIFICATIONS
✅ App.tsx - Inicializa notificaciones al arrancar
✅ MIGRATION_FIX_TRIP_PREFERENCES.sql - SQL lista para ejecutar
```

---

## 🛠️ PASO 2: Limpiar y preparar proyecto

```bash
# Terminal en c:\Users\T460s\trive-app

# 1. Limpiar build anterior
rm -r dist build

# 2. Instalar dependencias (por si faltó algo)
npm install

# 3. Verificar que expo está actualizado
npm list expo
# Debería mostrar: expo@~54.0.33
```

---

## 📱 PASO 3: Generar APK con EAS Build

### Opción A: Preview APK (Testing - Recomendado)
```bash
npx eas build --platform android --profile preview
```

**Qué hace:**
- Genera APK sin firmar (para testing)
- Incluye Expo Dev Client (completo soporte push notifications)
- Tarda: 10-15 minutos
- Descargable directamente desde terminal

**Resultado:**
```
✅ EAS Build completado
📥 APK descargado: trive-app-preview.apk
📦 Compatible con: Android 11+
```

### Opción B: Production APK (Para lanzar)
```bash
npx eas build --platform android --profile production
```

**Qué hace:**
- Genera APK firmado (para Google Play)
- Incluye push notifications completas
- Tarda: 15-20 minutos
- Necesita: Keystore configurado

---

## 💻 PASO 4: Instalar APK en dispositivo

### En Android físico:

```bash
# Una vez descargado el APK:

# 1. Conectar dispositivo Android vía USB
# 2. Habilitar USB debugging en Settings > Developer Options

# 3. Instalar APK
adb install trive-app-preview.apk

# 4. Esperar: "Success" en terminal
# 5. Abrir app desde menú de apps
```

### En Android Emulador:

```bash
# 1. Tener emulador corriendo
# 2. Instalar APK
adb install trive-app-preview.apk

# 3. App debería abrir automáticamente
```

---

## ✅ PASO 5: Verificar Notificaciones Push

### En la app:

```
1. Login con tu cuenta
2. Ir a Settings → Notifications
3. Verificar que "Push Notifications" está ON
4. Esperar mensaje: ✅ Token registrado
```

### Desde otra cuenta para enviar test:

```
1. Otra persona (o tú con otra cuenta) hace algo:
   - Reserva tu viaje
   - Te envía mensaje en chat
   - Acepta tu reserva (si eres conductor)

2. En tu dispositivo debería recibir:
   - Notificación PUSH con sonido
   - Vibración (si habilitado)
   - Aparece en lock screen

3. Verificar en Sentry:
   - Dashboard de Sentry
   - Debería haber registrado el evento
```

---

## 🔍 VERIFICACIÓN FINAL

Después de instalar APK, verificar:

```
✅ App abre sin errores
✅ Permite login
✅ Perfil carga (sin error de trip_preferences)
✅ Settings → Notifications visible
✅ Push token registrado (revisar logs)
✅ Puede enviar/recibir notificaciones
✅ Sentry reporta eventos correctamente
```

---

## 🐛 SI HAY PROBLEMAS

### Problema: "Push notifications no disponibles"
```
Causa: Device.isDevice = false
Solución: Usar dispositivo físico (no emulador)
```

### Problema: "Error en trip_preferences"
```
Causa: Migration SQL no ejecutada
Solución: Ejecutar MIGRATION_FIX_TRIP_PREFERENCES.sql en Supabase
```

### Problema: "Notificaciones no llegan"
```
Causa: Token no registrado
Solución:
1. Settings → Notifications → ON
2. Reiniciar app
3. Revisar logs en Sentry
```

### Problema: "APK no instala"
```
Causa: Versión incompatible
Solución:
1. Desinstalar versión anterior: adb uninstall com.traive.triveapp
2. Reintentar instalar: adb install trive-app-preview.apk
```

---

## 📋 CHECKLIST ANTES DE GENERAR APK

```
✅ Ejecuté MIGRATION_FIX_TRIP_PREFERENCES.sql en Supabase
✅ app.json tiene plugin expo-notifications
✅ app.json tiene permiso POST_NOTIFICATIONS
✅ App.tsx inicializa push notifications
✅ npm install completó sin errores
✅ No hay errores de TypeScript (npm run compile)
✅ He limpiado dist/ y build/
✅ Tengo dispositivo Android físico o emulador listo
```

---

## 🚀 COMANDO FINAL

```bash
cd c:\Users\T460s\trive-app

# Ejecutar migration SQL primero (en Supabase)

# Luego generar APK
npx eas build --platform android --profile preview

# Una vez descargado, instalar
adb install trive-app-preview.apk

# Abrir y probar
```

**Tiempo total:** 20-30 minutos (incluye EAS Build)

---

## 📞 SOPORTE

Si tienes problemas:
1. Revisar logs: `npm run android -- --clear`
2. Limpiar caché: `rm -r node_modules && npm install`
3. Verificar EAS: `eas account --info`
4. Revisar Sentry: https://sentry.io

---

**¿LISTO PARA GENERAR?** 🚀
Ejecuta paso por paso y reporta si hay errores.
