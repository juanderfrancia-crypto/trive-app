# 🧪 QA TESTING - FASE 1: INICIO

## ✅ PRECONDICIONES

- [x] 3 usuarios creados en BD
- [x] 2 rutas creadas en BD
- [x] Expo corriendo en puerto 8082
- [ ] App abierta en navegador o celular

---

## 📱 FASE 1: PREPARAR 3 DISPOSITIVOS / NAVEGADORES

**Necesitas 3 ventanas abiertas simultaneamente:**

### Opción A: 3 Navegadores (Chrome Dev Tools)
```
Ventana 1: Chrome → http://localhost:8082
Ventana 2: Chrome (incógnito) → http://localhost:8082
Ventana 3: Firefox → http://localhost:8082
```

### Opción B: Android / iOS (Real)
```
Dispositivo 1: Conductor
Dispositivo 2: Pasajero 1
Dispositivo 3: Pasajero 2
```

### Opción C: Mezcla
```
Ventana 1 (Chrome): Conductor
Ventana 2 (Chrome incógnito): Pasajero 1
Dispositivo Mobile: Pasajero 2
```

**👉 Recomendado: Opción A (más fácil para testing local)**

---

## 🚀 PASO 1: CONDUCTOR - LOGIN

### En Ventana 1 (Conductor):
```
Email: conductor1@test.com
Password: Test123!@#
```

**Click: "Log In"**

### ✅ Esperado:
```
✓ Login exitoso
✓ Panel del Conductor visible (My Rides / Create Route)
✓ Sin errores en consola
```

---

## 👤 PASO 2: PASAJERO 1 - LOGIN

### En Ventana 2 (Pasajero 1):
```
Email: pasajero1@test.com
Password: Test123!@#
```

**Click: "Log In"**

### ✅ Esperado:
```
✓ Login exitoso
✓ Tab "Available Rides" visible
✓ Puede ver rutas disponibles
```

---

## 👤 PASO 3: PASAJERO 2 - LOGIN

### En Ventana 3 (Pasajero 2):
```
Email: pasajero2@test.com
Password: Test123!@#
```

**Click: "Log In"**

### ✅ Esperado:
```
✓ Login exitoso
✓ Tab "Available Rides" visible
✓ Puede ver rutas disponibles
```

---

## 🎯 VERIFICACIÓN INICIAL

Con los 3 usuarios logueados, verifica:

### En cada ventana:
- [ ] Interfaz cargó sin errores
- [ ] Usuario correcto mostrado (name, email)
- [ ] Sin errores RLS en consola
- [ ] Sin errores de red

### En Conductor:
- [ ] Puede ver "My Rides" (vacío por ahora)
- [ ] Botón "Create New Ride" visible y clickeable
- [ ] Perfil muestra rol "Driver"

### En Pasajero 1 & 2:
- [ ] "Available Rides" muestra las 2 rutas creadas
- [ ] Pueden ver: Bogotá → Cali (4 seats)
- [ ] Pueden ver: Bogotá → Medellín (3 seats)
- [ ] Perfil muestra rol "Passenger"

---

## 📊 DASHBOARD DE TESTING

Mantén esta tabla actualizada:

| Componente | Conductor | Pasajero 1 | Pasajero 2 | Status |
|-----------|-----------|-----------|-----------|--------|
| Login | ✅ | ✅ | ✅ | |
| No errors | ✅ | ✅ | ✅ | |
| Rutas visibles | ✅ | ✅ | ✅ | |
| UI responsive | ✅ | ✅ | ✅ | |
| Consola limpia | ✅ | ✅ | ✅ | |

---

## ❌ SI ALGO FALLA

### "Login fallido"
```
→ Verifica email/password correcto
→ Abre DevTools (F12) y busca error en consola
→ Intenta limpiar localStorage: 
   DevTools → Application → Clear Site Data
```

### "Rutas no se ven en Pasajero"
```
→ Refresca página (F5)
→ Espera 3 segundos (polling)
→ Abre DevTools → Network y busca request a /routes
```

### "Error RLS en consola"
```
→ Abre Supabase Dashboard
→ SQL Editor → Ejecuta:
   SELECT * FROM profiles WHERE email = 'conductor1@test.com';
→ Verifica que el usuario existe
```

---

## ✅ CHECKLIST: FASE 1 COMPLETADA

- [ ] 3 usuarios logueados
- [ ] Conductor ve panel de conductor
- [ ] Pasajero 1 ve 2 rutas
- [ ] Pasajero 2 ve 2 rutas
- [ ] Sin errores en consola
- [ ] Sin errores RLS
- [ ] Interfaz responde bien (no congelada)

---

## 🎯 PRÓXIMO PASO

Cuando todo esté ✅ en Fase 1, continúa con:

**[QA_TESTING_PHASE2_CONDUCTOR_ROUTES.md](QA_TESTING_PHASE2_CONDUCTOR_ROUTES.md)**

---

## 📝 NOTAS

- Mantén las 3 ventanas abiertas durante todo el testing
- Anota cualquier error que veas (screenshot si es posible)
- Tiempo esperado Fase 1: **5 minutos**

---

**¿Comenzamos Fase 1 ahora?** 🚀
