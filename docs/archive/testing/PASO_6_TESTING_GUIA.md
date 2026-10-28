# 🧪 PASO 6: TESTING END-TO-END CHAT

## SETUP: 2 Dispositivos/Emuladores

Necesitas 2 instancias de la app corriendo (simulando 2 usuarios).

### OPCIÓN 1: Dos emuladores Android
```bash
# Terminal 1 - Emulador 1
npm start
# Presionar 'a' para Android Emulator 1

# Terminal 2 - Emulador 2 (DIFERENTE instancia)
npm start
# Presionar 'a' para Android Emulator 2
```

### OPCIÓN 2: Expo Go
```bash
# Terminal 1 (Metro)
npm start

# Device 1: Abrir Expo Go, escanear QR
# Device 2: Abrir Expo Go, escanear QR (mismo QR)
```

---

## TEST PLAN

### TEST 1: Cargar lista de conversaciones (vacía al inicio)

**User 1:**
- [ ] Abre app
- [ ] Navega a Chat
- [ ] Verifica: "No hay conversaciones aún" ✓

**User 2:**
- [ ] Abre app
- [ ] Navega a Chat
- [ ] Verifica: "No hay conversaciones aún" ✓

### TEST 2: Enviar primer mensaje

**User 1:**
- [ ] En HomeScreen, navega a Chat
- [ ] Debería estar vacío
- [ ] ❌ (No puede enviar aún - no hay usuario seleccionado)

### TEST 3: Integración con Booking (previo)

**IMPORTANTE:** Para que aparezca User 2 en la lista de User 1, deben haber:
1. Creado una ruta (como conductor)
2. User 1 reservó un asiento
3. Ahora sí pueden chatear

**Por ahora, TEST MANUAL SIN BOOKING:**

```typescript
// En useChat.ts, agregar test con ID hard-coded
const TEST_USER_ID = 'test-user-2-uuid' // Reemplazar con UUID real
const { loadConversation } = useChat(userId)

loadConversation(TEST_USER_ID) // Cargar conversación con usuario específico
```

### TEST 4: Flow Real

1. **Setup Datos:**
   ```sql
   -- Crear 2 usuarios de prueba (en Supabase)
   -- user1: asdf@asdf.com
   -- user2: asdf2@asdf2.com
   --
   -- Obtener sus UUIDs y usarlos en las pruebas
   ```

2. **User 1 → User 2 (Enviar mensaje):**
   - [ ] Navega a Chat → CargarConversación(user2)
   - [ ] Escribe: "Hola, ¿qué tal el viaje?"
   - [ ] Click enviar
   - [ ] Verifica: Mensaje aparece en la burbuja azul (derecha) ✓

3. **User 2 (Recibir):**
   - [ ] Refresh automático cada 2s (polling)
   - [ ] Debería ver mensaje en burbuja gris (izquierda) ✓
   - [ ] Notificación push (si está habilitada) ✓

4. **User 2 → User 1 (Responder):**
   - [ ] Escribe: "¡Muy bueno!"
   - [ ] Click enviar
   - [ ] Verifica: Mensaje aparece en su chat ✓

5. **User 1 (Recibir respuesta):**
   - [ ] Automáticamente actualiza ✓
   - [ ] Ve mensaje de User 2 ✓

### TEST 5: Marcar como leído

- [ ] User 2 envía mensaje a User 1
- [ ] User 1 recibe (aparece con is_read=false)
- [ ] User 1 abre conversación
- [ ] En DB, debería actualizarse a is_read=true
- [ ] Verifica en Supabase:
  ```sql
  SELECT * FROM messages WHERE to_user_id = '[user1_id]' AND is_read = true
  ```

### TEST 6: Lista de conversaciones (actualización)

- [ ] User 1 y User 2 intercambien 3+ mensajes
- [ ] Vuelven a ChatScreen (lista de conversaciones)
- [ ] Ambos ven:
  - [ ] Nombre del otro usuario
  - [ ] Último mensaje enviado
  - [ ] Unread badge (si aplica)

### TEST 7: Performance

- [ ] Intercambiar 10 mensajes rápidamente
- [ ] Verificar: Polling cada 2s funciona ✓
- [ ] No hay lag ni crashes ✓

---

## CHECKLIST FINAL

- [ ] PASO 1: Tabla messages creada ✓
- [ ] PASO 2: messages.ts sin errores ✓
- [ ] PASO 3: useChat.ts sin errores ✓
- [ ] PASO 4: ChatScreen + ChatBubble sin errores ✓
- [ ] PASO 5: AppNavigator integrado ✓
- [ ] PASO 6: Testing completado:
  - [ ] Test 1: Lista vacía ✓
  - [ ] Test 2: Enviar mensaje ✓
  - [ ] Test 3: Recibir mensaje ✓
  - [ ] Test 4: Marcar como leído ✓
  - [ ] Test 5: Lista de conversaciones actualiza ✓
  - [ ] Test 6: Sin crashes ✓

---

## ⚠️ TROUBLESHOOTING

### "No puedo ver conversaciones"
- [ ] ¿Ambos usuarios tienen mensajes en BD?
  ```sql
  SELECT COUNT(*) FROM messages
  ```
- [ ] ¿IDs de usuario correctos?
- [ ] ¿RLS policies correctas?

### "Mensaje no se envía"
- [ ] ¿Hay error en consola?
- [ ] ¿from_user_id !== to_user_id? (constraint)
- [ ] ¿Usuario autenticado?

### "Mensaje no se recibe"
- [ ] ¿Polling activo cada 2s?
- [ ] ¿RLS policy permite leer?
- [ ] Abre DevTools y verifica:
  ```
  getConversation(userId, otherUserId) responde datos
  ```

### "Performance lenta"
- [ ] Polling cada 2s es OK para MVP
- [ ] Si > 100 mensajes: Agregar pagination
- [ ] Para v1.1: Implementar WebSocket

---

## 📋 COMANDOS ÚTILES

```bash
# Ver logs en tiempo real
npm start

# Limpiar caché
expo start --clear

# Abrir Supabase en browser
open https://app.supabase.com

# Ver tabla messages en BD
SELECT * FROM messages ORDER BY created_at DESC LIMIT 20
```

---

## ✅ SUCCESS CRITERIA

**DÍA 2 COMPLETADO SI:**
- ✓ 2 usuarios pueden intercambiar mensajes en < 2 segundos
- ✓ Mensajes se marcan como leídos automáticamente
- ✓ No hay crashes ni errores de TypeScript
- ✓ App compila sin warnings críticos
- ✓ Notificaciones se crean automáticamente (NOTIFICATIONS table tiene registros)

**NEXT STEP:**
- Si TODO pasó → DÍA 3: Push Notifications Android
- Si hay issues → Debug + Replay PASO 6
