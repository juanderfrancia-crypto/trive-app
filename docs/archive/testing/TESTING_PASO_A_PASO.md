# 🧪 TESTING PLAN - DÍA 2 CHAT

**UUIDs para Testing:**
```
Usuario 1: 6be31d6b-087a-480e-b66d-49dede51316a
Usuario 2: 6f469580-07e6-4a0f-9354-ad695cbead0c
```

---

## TEST 1: Abrir app en Web

**En terminal (donde está corriendo Metro):**
```
Presionar 'w' para abrir en navegador
```

Debería abrir: http://localhost:8083

---

## TEST 2: Login Usuario 1

**En navegador:**
1. Verás LoginPhoneScreen
2. Ingresa el Email del Usuario 1 (búscalo en Supabase o usa cualquier email registrado)
3. Presiona "Siguiente"
4. Completa el PIN/OTP si es necesario
5. ¿Llegar a HomeScreen? ✅

---

## TEST 3: Navegar a Chat

**En HomeScreen:**
1. Scroll hacia abajo o busca el botón "💬 Chat" 
2. Click en Chat
3. Debería ver:
   - Título "Mensajes"
   - Botón azul "🧪 Test Chat"
   - Área vacía con "No hay conversaciones aún"

**Status**: ✅ Chatear

---

## TEST 4: Iniciar Test Chat con Usuario 2

**En ChatScreen:**
1. Click en botón azul "🧪 Test Chat"
2. Aparecerá Modal con campo de texto
3. Copia y pega UUID del Usuario 2:
   ```
   6f469580-07e6-4a0f-9354-ad695cbead0c
   ```
4. Click en botón "Chatear"

**Lo que debería pasar:**
- Modal desaparece
- Ves una conversación con Usuario 2
- Hay:
  - Header con "← Atrás" y nombre del usuario
  - Área vacía de mensajes
  - Input de texto + botón enviar

**Status**: ✅ Abierta conversación

---

## TEST 5: Enviar Primer Mensaje

**En la conversación:**
1. Escribe: "Hola, ¿qué tal? 👋"
2. Click en botón enviar (↑)
3. El mensaje debería:
   - Aparecer en burbuja AZUL (lado derecho)
   - Tener timestamp "hace 0 segundos"
   - Desaparecer del input

**Status**: ✅ Mensaje enviado

---

## TEST 6: Verificar Mensaje en DB

**En Supabase SQL Editor:**
```sql
SELECT id, from_user_id, to_user_id, message, is_read, created_at 
FROM messages 
ORDER BY created_at DESC 
LIMIT 5;
```

**Debería ver:**
- 1 fila con:
  - from_user_id = 6be31d6b-087a-480e-b66d-49dede51316a (Usuario 1)
  - to_user_id = 6f469580-07e6-4a0f-9354-ad695cbead0c (Usuario 2)
  - message = "Hola, ¿qué tal? 👋"
  - is_read = FALSE (aún no leído)

**Status**: ✅ Mensaje en BD

---

## TEST 7: Recibir Mensaje (Simular Usuario 2)

**Opción A: Abrir otra pestaña (Manual)**
1. Abre pestaña nueva
2. Pega http://localhost:8083
3. Login con Usuario 2
4. Navega a Chat
5. Click "🧪 Test Chat"
6. Pega UUID de Usuario 1: `6be31d6b-087a-480e-b66d-49dede51316a`
7. Click "Chatear"

**Lo que debería ver:**
- Mensaje de Usuario 1 en burbuja GRIS (lado izquierdo)
- Timestamp "hace X segundos"

**Opción B: Monitorear DB (Más rápido)**
- En Supabase, verifica que `is_read` cambió a TRUE si Usuario 2 abrió la conversación

---

## TEST 8: Responder desde Usuario 2

**En la pestaña del Usuario 2 (conversación abierta):**
1. Escribe: "¡Muy bien! ¿Y tú? 😊"
2. Click enviar
3. El mensaje aparece en burbuja AZUL

---

## TEST 9: Recibir Respuesta en Usuario 1

**Espera 2-3 segundos (polling)**
- Usuario 1 debería ver automáticamente el mensaje de Usuario 2 en burbuja GRIS

---

## TEST 10: Verificar Notificación

**En Supabase:**
```sql
SELECT id, user_id, type, title, is_read, created_at 
FROM notifications 
WHERE type = 'message'
ORDER BY created_at DESC 
LIMIT 5;
```

**Debería ver:**
- 2 filas de notificaciones (una por cada mensaje)
- type = 'message'
- user_id = del receptor

---

## ✅ CHECKLIST FINAL

- [ ] TEST 1: Web abre sin errores
- [ ] TEST 2: Login funciona
- [ ] TEST 3: Navegación a Chat OK
- [ ] TEST 4: Botón Test Chat funciona
- [ ] TEST 5: Enviar mensaje OK (aparece en burbuja azul)
- [ ] TEST 6: Mensaje en BD correctamente
- [ ] TEST 7: Recibir mensaje OK (aparece en burbuja gris)
- [ ] TEST 8: Responder OK
- [ ] TEST 9: Polling automático funciona (< 3 segundos)
- [ ] TEST 10: Notificaciones creadas

---

## ⚠️ TROUBLESHOOTING

### "Modal de Test Chat no aparece"
- [ ] ¿Estás en ChatScreen? (debería ver "Mensajes" arriba)
- [ ] ¿El botón azul es visible?
- [ ] Recarga la página (F5 en web)

### "Error al chatear"
- [ ] ¿Copiaste el UUID completo sin espacios?
- [ ] ¿El UUID es válido? (debe ser formato UUID)
- [ ] Abre DevTools (F12) y verifica consola

### "Mensaje no se envía"
- [ ] ¿El input tiene texto?
- [ ] ¿Presionaste el botón ↑?
- [ ] Verifica consola de errores

### "No veo el mensaje del otro usuario"
- [ ] Espera 2-3 segundos (polling)
- [ ] Recarga la página
- [ ] Verifica que el mensaje esté en BD (TEST 6)

### "App muy lenta"
- [ ] Normal en development build
- [ ] Prueba en Android/iOS después
- [ ] Polling cada 2s es OK para MVP

---

## 🎯 ÉXITO = 

Si ves:
1. ✅ Enviar mensaje → aparece en burbuja azul
2. ✅ Ir a otra pestaña → ves mensaje en burbuja gris
3. ✅ Responder → aparece en usuario 1
4. ✅ Sin crashes → DÍA 2 COMPLETADO

**Next**: Mañana DÍA 3 → Push Notifications Android

---

## 📝 NOTAS

- Polling cada 2s es NORMAL (vs WebSocket)
- En production será más rápido
- MVP no tiene: búsqueda, archivos, typing, voice
- Todas esas features en v1.1

---

**Hazlo saber cuando termines los tests! 🚀**
