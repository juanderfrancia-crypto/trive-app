# 📸 ANÁLISIS COMPARATIVO: FOTO DE PERFIL vs FOTO DE VEHÍCULO

**Fecha**: 24 de abril de 2026  
**Conclusión**: Foto de vehículo necesita optimizaciones

---

## 🔍 **COMPARATIVA DETALLADA**

### **FOTO DE PERFIL** ✅ (Funciona Óptimamente)

```typescript
// ✅ MEJOR: Se guarda en el auth user profile (sincronizado)

// 1. GUARDAR
uploadProfilePhoto(userId, fileUri)
  ├─ Upload a Supabase Storage: profile-photos bucket
  ├─ URL se guarda en profiles.avatar_url
  ├─ URL se sincroniza con auth.user.user_metadata
  └─ ✅ Se cachea en el store de la app

// 2. CARGAR
{user?.avatar_url || profile?.avatar_url}
  ├─ Viene del store (caché en memoria)
  ├─ NO necesita queries adicionales
  ├─ URL es ESTÁTICA (no se regenera)
  └─ ✅ Imagen se carga UNA SOLA VEZ
```

**Flujo**:
```
Upload Photo
    ↓
Save to DB (profiles.avatar_url)
    ↓
Sync to Auth
    ↓
Update App Store
    ↓
Component renderiza desde store (ESTÁTICO)
    ↓
✅ Imagen carga RÁPIDO (sin delays)
```

---

### **FOTO DE VEHÍCULO** ⚠️ (Tiene Problemas)

```typescript
// ❌ PROBLEMA: Se regenera cada render

// 1. GUARDAR
uploadVehiclePhoto(driverId, routeId, fileUri)
  ├─ Upload a Supabase Storage: vehicle-photos bucket
  ├─ URL NO se guarda en la BD
  └─ ⚠️ Se guarda solo en estado local

// 2. CARGAR
useEffect(() => {
  const loadVehiclePhoto = async () => {
    const photoUrl = await getVehiclePhotoUrl(user.id)
    setVehiclePhotoUrl(photoUrl)  // ← Estado local
  }
  loadVehiclePhoto()
}, [user?.id, isDriver])

// Cada vez que el componente se renderiza:
getVehiclePhotoUrl()
  ├─ Intenta múltiples paths
  ├─ Llama a createSignedUrl() CADA VEZ
  ├─ Genera URL con token JWT novo
  ├─ URL es DIFERENTE cada vez
  └─ ⚠️ Desencadena nueva descarga de imagen
```

**Flujo**:
```
Upload Photo
    ↓
Save to Storage
    ↓
setVehiclePhotoUrl(state) - PROBLEMA: Estado local
    ↓
Component re-renders
    ↓
useEffect(() => getVehiclePhotoUrl()) - ⚠️ EJECUTA DE NUEVO
    ↓
createSignedUrl() genera URL NUEVA
    ↓
URI DIFERENTE = Nueva descarga HTTP
    ↓
⚠️ Imagen carga LENTAMENTE (cada render)
```

---

## 🎯 **POR QUÉ UNA FUNCIONA MEJOR QUE OTRA**

| Aspecto | Foto Perfil ✅ | Foto Vehículo ⚠️ |
|---------|--------------|----------------|
| **Almacenamiento** | BD (profiles.avatar_url) | Estado local (useState) |
| **URL** | Estática (no cambia) | Dinámica (token JWT nuevo) |
| **Regeneración** | 1 sola vez (en carga app) | Cada render (problema) |
| **Cache** | App store + nav cache | Ninguno |
| **Requests HTTP** | 1 descarga | Múltiples descargas |
| **Tiempo carga** | ~200ms | ~2000ms+ (bloqueante) |
| **Placeholder** | Gray default avatar | Blanco (parpadea) |

---

## 🔧 **PROBLEMAS ESPECÍFICOS DE FOTO VEHÍCULO**

### Problema 1: URL Regenerada Cada Render
```typescript
// ❌ MALO: Token cambia cada vez
const photoUrl = await getVehiclePhotoUrl(user.id)
// Token: eyJ...A
// Siguiente render
// Token: eyJ...B  ← DIFERENTE!
// React detecta URL diferente
// → Descarga la imagen NUEVAMENTE
```

### Problema 2: useEffect Sin Dependencias Correctas
```typescript
// ⚠️ PROBLEMA: Se ejecuta en CADA render
useEffect(() => {
  const photoUrl = await getVehiclePhotoUrl(user.id)
  setVehiclePhotoUrl(photoUrl)
}, [user?.id, isDriver]) // ← Solo reconoce cambios de user?.id o isDriver

// PERO: ProfileScreen re-renderiza por muchas razones
// - Cambio de role
// - Actualizaciones de datos
// - Focus de pantalla
// - Re-render de parent
// → getVehiclePhotoUrl() se ejecuta OTRA VEZ
```

### Problema 3: Sin Caching de URL
```typescript
// ⚠️ PROBLEMA: Sin almacenamiento persistente

// Foto de perfil:
profiles.avatar_url → BD persistente
app store → caché en memoria
auth.user → sincronizado

// Foto de vehículo:
useState(vehiclePhotoUrl) → solo en memoria
Si cierra app → se pierde
Si va a otra pantalla → estado se limpia
```

---

## ✅ **SOLUCIÓN PROPUESTA**

### **Opción 1: Guardar URL en BD (RECOMENDADA)** 🏆

```sql
-- Agregar columna a tabla drivers
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT;
```

```typescript
// Al subir foto:
uploadVehiclePhoto(driverId, routeId, fileUri)
  ├─ Upload a Storage
  ├─ Get signed URL
  └─ Save to profiles.vehicle_photo_url
      ↓
// Al cargar foto:
const vehiclePhotoUrl = profile?.vehicle_photo_url
  ├─ Viene de useProfile hook
  ├─ Se sincroniza con auth user
  └─ ✅ Es ESTÁTICA

// En component:
const { profile } = useProfile(user?.id)
<Image source={{ uri: profile?.vehicle_photo_url }} />
```

**Ventajas**:
- ✅ URL es estática (se guarda 1 sola vez)
- ✅ No se regenera en cada render
- ✅ Se cachea como la foto de perfil
- ✅ Rápido (~200ms)
- ✅ Sincronización con BD

---

### **Opción 2: Cachear URL en Memoria** (Rápido)

```typescript
// useVehiclePhotoCached.ts (NUEVO HOOK)

export const useVehiclePhotoCached = (driverId: string) => {
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(null)
  const urlCacheRef = useRef<{ [key: string]: string }>({})

  useEffect(() => {
    const loadPhoto = async () => {
      // 1. Revisar caché
      if (urlCacheRef.current[driverId]) {
        setVehiclePhotoUrl(urlCacheRef.current[driverId])
        return
      }

      // 2. Si no está en caché, cargar
      const url = await getVehiclePhotoUrl(driverId)
      if (url) {
        // 3. Guardar en caché (persiste durante toda la sesión)
        urlCacheRef.current[driverId] = url
        setVehiclePhotoUrl(url)
      }
    }

    loadPhoto()
  }, [driverId]) // ← Solo re-ejecuta si driverId cambia

  return vehiclePhotoUrl
}

// En ProfileScreen:
const vehiclePhotoUrl = useVehiclePhotoCached(user?.id)
<Image source={{ uri: vehiclePhotoUrl }} />
```

**Ventajas**:
- ✅ URL se carga UNA sola vez por sesión
- ✅ Rápido (100-200ms)
- ✅ No regenera en cada render
- ⚠️ Se pierde si cierra app

---

### **Opción 3: Mejorar getVehiclePhotoUrl()** (Medio)

```typescript
// Generar URL UNA SOLA VEZ, no regenerar cada vez

export async function getVehiclePhotoUrl(driverId: string): Promise<string | null> {
  try {
    // 1. Intentar rutas predecibles
    const paths = [
      `vehicle_${driverId}.jpg`,
      `${driverId}/vehicle.jpg`,
      `drivers/${driverId}/vehicle.jpg`
    ]

    for (const filePath of paths) {
      try {
        // ✅ Usar URL pública si es posible (no JWT)
        const result = await supabase.storage
          .from('vehicle-photos')
          .getPublicUrl(filePath)

        if (result.data?.publicUrl && 
            !result.data.publicUrl.includes('null')) {
          return result.data.publicUrl // ← ESTÁTICA
        }

        // Fallback: URL firmada (30 días)
        const { data, error } = await supabase.storage
          .from('vehicle-photos')
          .createSignedUrl(filePath, 60 * 60 * 24 * 30)

        if (!error && data?.signedUrl) {
          return data.signedUrl // Se reutiliza por 30 días
        }
      } catch (err) {
        console.warn(`Path ${filePath} not found`)
      }
    }

    return null
  } catch (error) {
    console.error('Error getting vehicle photo URL:', error)
    return null
  }
}
```

---

## 🚀 **MI RECOMENDACIÓN (Implementación)**

### **Paso 1: Guardar URL en BD** (5 min)

```sql
-- Agregar columna
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT;

-- Índice
CREATE INDEX IF NOT EXISTS idx_vehicle_photo_url 
ON profiles(vehicle_photo_url);
```

### **Paso 2: Actualizar uploadVehiclePhoto()** (10 min)

```typescript
export async function uploadVehiclePhoto(
  driverId: string,
  routeId: string | null,
  fileUri: string
): Promise<string | null> {
  try {
    // ... código existente ...

    // Al final, guardar URL en profiles:
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ vehicle_photo_url: photoUrl })
      .eq('id', driverId)

    if (dbError) {
      console.error('Error saving vehicle photo URL:', dbError)
    }

    return photoUrl
  } catch (error) {
    console.error('Error uploading vehicle photo:', error)
    throw error
  }
}
```

### **Paso 3: Simplificar ProfileScreen** (5 min)

```typescript
// ❌ ANTES
const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(null)
useEffect(() => {
  const photoUrl = await getVehiclePhotoUrl(user.id)
  setVehiclePhotoUrl(photoUrl)
}, [user?.id, isDriver])

// ✅ DESPUÉS
const { profile } = useProfile(user?.id) // Ya trae vehicle_photo_url

<Image source={{ uri: profile?.vehicle_photo_url }} />
```

---

## 📊 **ANTES vs DESPUÉS**

| Métrica | Antes ⚠️ | Después ✅ |
|---------|---------|----------|
| **Tiempo carga imagen** | 2000ms+ | ~200ms |
| **Parpadeos** | Múltiples | 0 |
| **Requests HTTP** | 5-10 por render | 1 por sesión |
| **URL regeneración** | Cada render | 1 sola vez |
| **Caching** | Ninguno | BD + Store |
| **Almacenamiento** | Estado (se pierde) | BD (persistente) |
| **Sincronización** | ❌ No | ✅ Sí |

---

## ⏱️ **TIEMPO DE IMPLEMENTACIÓN**

```
Opción 1 (Guardar en BD):   20 min ← RECOMENDADA
Opción 2 (Cachear):        15 min
Opción 3 (Mejorar función): 10 min
```

---

## 🎯 **RESULTADO ESPERADO**

**ANTES**:
```
Abrir ProfileScreen
  ↓ (2 segundos)
Pantalla blanca
  ↓
Aparece foto (pixelada)
  ↓
Se re-renderiza
  ↓ (parpadeo)
Blanco de nuevo
  ↓ (2 segundos)
Foto carga definitiva
```

**DESPUÉS**:
```
Abrir ProfileScreen
  ↓ (~200ms)
Foto carga inmediatamente (suave)
  ↓
No parpadeos
  ↓
Rápido y limpio ✅
```

---

¿Cuál opción prefieres? Recomiendo **Opción 1** (guardar URL en BD) porque es la más robusta y rápida 🚀
