# 📱 INSTRUCCIONES: INSTALAR APK DESCARGADO

**Cuando el build de EAS termine**, recibirás un enlace para descargar el APK.

Sigue estos pasos:

---

## PASO 1: Descargar APK

```
1. Cuando veas en la terminal:
   ✅ Build completed!
   
2. Aparecerá un enlace como:
   https://expo.dev/artifacts/...
   
3. Click en el enlace o copia la URL
4. Se descargará: trive-app-preview.apk (150-200 MB)
```

---

## PASO 2: Preparar dispositivo Android

### Si es físico:
```
1. Conectar Android vía USB
2. Settings → Developer Options → USB Debugging: ON
3. En PC, abrir terminal y ejecutar:
   adb devices
   
   Debería mostrar:
   List of attached devices:
   emulator-5554          device
   
   O tu dispositivo real con su serial
```

### Si es emulador:
```
1. Tener emulador corriendo
2. Android Studio → Device Manager → Play (tu emulador)
3. Esperar que boot completamente
```

---

## PASO 3: Desinstalar versión anterior (si existe)

```bash
adb uninstall com.traive.triveapp
```

**Resultado esperado:**
```
Success
```

---

## PASO 4: Instalar APK descargado

```bash
# Cambiar "trive-app-preview.apk" por la ruta real
cd C:\Users\T460s\Downloads

adb install trive-app-preview.apk
```

**Mientras instala verás:**
```
Reading trive-app-preview.apk...
Installing com.traive.triveapp...
Success
```

---

## PASO 5: Abrir la app

```
1. En dispositivo Android, ir a home
2. Abrir "Trive" desde app drawer
3. App debería abrir sin errores
4. Login con tu cuenta
```

---

## ✅ VERIFICACIONES IMPORTANTES

Una vez dentro de la app:

```
1️⃣ Ir a Settings → Notifications
   - Verificar que "Push Notifications" = ON
   - Esperar 5 segundos
   - Debería mostrar: ✅ Token registrado
   
2️⃣ Ir a Settings → Profile
   - Verificar foto de vehículo carga (sin errores de trip_preferences)
   
3️⃣ En otra app o navegador:
   - Con otra cuenta (o amigo), envía mensaje en chat
   - O reserva tu viaje
   - Deberías recibir NOTIFICACIÓN PUSH en dispositivo
   - Sonido + vibración + aparece en lock screen
```

---

## 🔍 VERIFICACIÓN EN SENTRY

Para confirmar que Sentry está captando eventos:

```
1. Ve a: https://sentry.io
2. Login con tu cuenta
3. Project: TRIVE
4. Busca eventos recientes
5. Deberías ver logs de:
   - App iniciada
   - Notificaciones registradas
   - Interacciones del usuario
```

---

## 🐛 SI ALGO FALLA

### "App no abre"
```
Solución:
adb uninstall com.traive.triveapp
adb install trive-app-preview.apk
Reintentar
```

### "Error de trip_preferences en logs"
```
Significa que la migration SQL no se ejecutó
Solución:
1. Abre Supabase
2. Ejecuta MIGRATION_FIX_TRIP_PREFERENCES.sql
3. Reinicia app
```

### "No recibe notificación push"
```
Causas comunes:
- Settings → Notifications OFF (activar ON)
- Phone en Airplane mode (desactivar)
- Battery saver activado (desactivar)
- Sin internet (verificar)
Solución:
- Reiniciar app
- Reiniciar teléfono
- Revisar logs en Sentry
```

### "Notificación llega atrasada"
```
Normal en:
- Wifi lento
- 4G débil
- Phone con mucho uso de batería
Recomendación: Usar en buena conexión para testing
```

---

## 📋 CHECKLIST FINAL

```
✅ APK descargado (trive-app-preview.apk)
✅ Versión anterior desinstalada
✅ APK instalado exitosamente
✅ App abre sin errores
✅ Login completado
✅ Settings → Notifications = ON
✅ Token registrado visiblemente
✅ Notificación de prueba recibida
✅ Sentry muestra eventos
✅ No hay errores de trip_preferences
```

---

## ⏱️ TIMELINE

- Descarga APK: 5-10 minutos
- Desinstalar + Instalar: 2-3 minutos
- Abrir app: 10 segundos
- Verificar notificaciones: 5 minutos
- **TOTAL: 15-20 minutos**

---

## 📞 SOPORTE

Si tienes problemas:

1. Revisar logs:
   ```bash
   adb logcat | grep -i "trive\|notification\|error"
   ```

2. Revisar Sentry:
   ```
   https://sentry.io → TRIVE → Issues
   ```

3. Verificar internet:
   ```bash
   adb shell
   ping google.com
   ```

---

**ESPERA A QUE EL BUILD TERMINE Y LUEGO SIGUE ESTOS PASOS** ✅
