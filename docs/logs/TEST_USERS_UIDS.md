# 🔑 TEST USERS - UIDs Reference

## 📝 Instrucciones

1. **Abre Supabase SQL Editor**
   - Dashboard → SQL Editor → "New Query"

2. **Ejecuta este query:**
```sql
SELECT 
  id as UID,
  email,
  role,
  created_at
FROM public.profiles 
WHERE email IN ('test1@trive.local', 'test2@trive.local')
ORDER BY email;
```

3. **Copia los resultados aquí:**

---

## ✅ TEST USER #1 - Pasajero

| Propiedad | Valor |
|-----------|-------|
| **Email** | test1@trive.local |
| **Password** | Test123!@# |
| **Role** | passenger |
| **UID** | `AQUÍ VA EL UUID` |
| **Status** | ✅ Crear en Auth |

---

## ✅ TEST USER #2 - Conductor

| Propiedad | Valor |
|-----------|-------|
| **Email** | test2@trive.local |
| **Password** | Test123!@# |
| **Role** | driver |
| **UID** | `AQUÍ VA EL UUID` |
| **Status** | ✅ Crear en Auth |

---

## 🧪 Testing con estos Users

### **Test User 1 (Passenger):**
- Login → Buscar rutas
- Reservar viaje
- Ver ratings de drivers
- Cancelar y ver refund
- Guardar ruta en favoritos
- Ver historial cancelaciones
- Configurar preferencias

### **Test User 2 (Driver):**
- Login como driver
- Crear viaje
- Ver solicitudes de pasajeros
- Calificar pasajeros
- Ver analytics (si es admin)

---

## 🔔 Push Notifications Testing

Con APK instalada:
1. Login con test1@trive.local
2. Crear booking
3. Switch a test2@trive.local (en otro dispositivo)
4. Aceptar booking
5. **Verificar**: ¿Llega notificación en dispositivo 1?
6. Anotar timestamp

---

## 📊 Features a Probar

### **Rating Visible** ⭐
- [ ] SearchScreen muestra ⭐⭐⭐⭐ en cards

### **Cancelación Inteligente** 🔄
- [ ] ScheduledTrips muestra refund preview
- [ ] Aparece toast: "Cancelada 50% reembolso - $2,600"

### **Historiales & Analytics** 📊
- [ ] Settings → Historial Cancelaciones
- [ ] Settings → Preferencias de Viaje
- [ ] Settings → Rutas Favoritas
- [ ] Admin: 📊 botón con Analytics

### **Push Notifications** 🔔
- [ ] Recibe notificación de nueva ruta
- [ ] Se abre app en ruta correcta
- [ ] Se registra en Firebase Console

---

## 🐛 Debug Info

**Logs útiles:**
```bash
# En Expo Go terminal:
adb logcat | grep "firebase\|notification\|trive"

# O en VS Code terminal:
npx expo start --tunnel
```

**Verificar en Firebase:**
- Console → Messaging → Ver deliveries
- Cloud Functions → Ver errors

---

## 📝 Notas de Testing

```
Test Date: 8 de Abril 2026
Device: [Tu dispositivo]
APK Version: [Versión EAS]
Supabase Project: [Tu proyecto]

Observaciones:
- 
- 
-
```

---

## ✅ Cuando termines testing

1. ✅ Confirmar que nuevo usuario registros
2. ✅ Confirmar cancelación con refund
3. ✅ Confirmar ratings visibles
4. ✅ Confirmar favoritos guardador
5. ✅ Confirmar analytics visible  
6. ✅ Confirmar push notifications
7. ✅ Anotar cualquier bug

---

**Ready?** 🚀 ¡Adelante con testing!
