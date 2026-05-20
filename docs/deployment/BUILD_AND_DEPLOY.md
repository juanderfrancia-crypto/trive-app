# Build y Deploy — Trive

**Última actualización:** 2026-05-20  
**Cuenta EAS:** `instaj` (`triveestara@gmail.com`)  
**Proyecto EAS:** `trive-app` (`e77b81ed-087c-4f3f-8f52-8523ed24b9cc`)  
**Repositorio:** `https://github.com/juanderfrancia-crypto/trive-app`

---

## Requisitos previos

- Node.js 18+
- `eas-cli` instalado globalmente: `npm install -g eas-cli`
- Sesión activa: `eas login` (cuenta `instaj`)
- Verificar sesión: `eas whoami`

---

## Configuración del proyecto (`app.json`)

```json
{
  "expo": {
    "owner": "instaj",
    "extra": {
      "eas": {
        "projectId": "e77b81ed-087c-4f3f-8f52-8523ed24b9cc"
      }
    },
    "android": {
      "package": "com.traive.triveapp",
      "googleServicesFile": "$GOOGLE_SERVICES_JSON"
    },
    "plugins": [
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#1230B8"
      }]
    ]
  }
}
```

### Variables de entorno secretas en EAS

`google-services.json` **no está en git**. Está subida como variable secreta en EAS:

```bash
# Ver variables configuradas
eas env:list --scope project

# Si necesitas volver a subirla
eas env:create --scope project --name GOOGLE_SERVICES_JSON --type file \
  --visibility secret --value google-services.json --environment production

eas env:create --scope project --name GOOGLE_SERVICES_JSON --type file \
  --visibility secret --value google-services.json --environment preview
```

---

## Perfiles de build (`eas.json`)

```json
{
  "build": {
    "development": { "android": { "buildType": "apk" } },
    "preview":     { "android": { "buildType": "apk" } },
    "production":  { "android": { "buildType": "app-bundle" } }
  }
}
```

| Perfil | Formato | Uso |
|--------|---------|-----|
| `development` | APK | Desarrollo local, debug |
| `preview` | APK | Pruebas internas, QA |
| `production` | AAB | Google Play Store |

---

## Comandos de build

```bash
# Preview (APK para pruebas) — el más usado
eas build --profile preview --platform android

# Producción (AAB para Play Store)
eas build --profile production --platform android

# Ver builds anteriores
eas build:list
```

El build corre en los servidores de Expo. El APK descargable aparece al finalizar con una URL tipo:
```
https://expo.dev/artifacts/eas/xxxx.apk
```

También accesible desde:
```
https://expo.dev/accounts/instaj/projects/trive-app/builds
```

---

## Ícono de notificaciones

- Archivo: `assets/notification-icon.png`
- Formato: PNG blanco sobre fondo transparente, 192×192 px
- Color de fondo: `#1230B8`
- Configurado en `app.json` bajo `plugins > expo-notifications`

---

## Push notifications — Project ID

El token de Expo Push se obtiene usando el `projectId` del `app.json`:
```
e77b81ed-087c-4f3f-8f52-8523ed24b9cc
```

Verificar en `src/services/pushNotifications.ts`.

---

## Keystore Android

- Generado automáticamente por EAS en el primer build
- Nombre: `Build Credentials NVMtsmeQfN` (default)
- Gestionado por Expo — no requiere acción manual

---

## Troubleshooting frecuente

### "Not authorized" al hacer build
```bash
eas whoami        # verificar cuenta
eas logout
eas login         # volver a entrar con instaj
```

### google-services.json faltante
La variable `GOOGLE_SERVICES_JSON` debe estar creada en EAS para los entornos `production` y `preview`. Ver sección de variables de entorno arriba.

### Metro cache corrupto (errores de JSX en código correcto)
```bash
npx expo start --clear
```

### Cambiar el projectId (si se revincula el proyecto)
1. Actualizar `extra.eas.projectId` en `app.json`
2. Actualizar el `projectId` en `src/services/pushNotifications.ts` si aplica

---

## Flujo recomendado antes de cada build

1. `git pull origin master` — tener el código más reciente
2. Revisar que no haya errores de TypeScript: `npx tsc --noEmit`
3. `eas build --profile preview --platform android`
4. Descargar el APK y probar en dispositivo físico
5. Si todo OK → `eas build --profile production --platform android`
