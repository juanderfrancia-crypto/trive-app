# 🎯 EMPEZAR MAÑANA - DÍA 2 PLAN EXPRESS

**Fecha**: 8 de abril de 2026  
**Meta**: Chat funcional end-to-end  
**Tiempo**: 8 horas  
**Status**: Ready to go

---

## 📚 DOCUMENTOS EN ORDEN

### Leer AHORAminds (Hoy, 30 min):

1. **[ROADMAP_FINAL_7_DIAS.md](ROADMAP_FINAL_7_DIAS.md)** ← START HERE
   - Visión completa 7 días
   - Timeline
   - Decision points

2. **[DIA_2_CHAT_DETAILED_PLAN.md](DIA_2_CHAT_DETAILED_PLAN.md)** ← BLUEPRINT
   - Paso a paso detallado
   - SQL + Service + Hook + UI
   - Testing strategy

### Referencia durante trabajo (Mañana):

3. **[DIA_3_PUSH_ANDROID_DETAILED_PLAN.md](DIA_3_PUSH_ANDROID_DETAILED_PLAN.md)**
   - Guardado para DÍA 3
   - Partner Dev 2 puede leer hoy

---

## ⏰ HORARIO MAÑANA (DÍA 2)

```
09:00 - 09:15   Team sync: Review plan
09:15 - 09:45   PASO 1: Database messages table
09:45 - 10:15   Verification + coffee break
10:15 - 11:45   PASO 2: messages.ts service
11:45 - 12:30   Verification

12:30 - 13:30   LUNCH BREAK

13:30 - 14:30   PASO 3: useChat.ts hook
14:30 - 15:00   Verification

15:00 - 17:30   PASO 4: UI components
                (ChatBubble + ChatScreen)

17:30 - 18:00   PASO 5: Navigation integration

18:00 - 19:00   PASO 6: Testing (2 devices)

19:00 - 19:15   Final verification + commit
19:15+          DONE! 🎉
```

---

## 🎬 PREPARACIÓN HOY

### Setup:

```bash
# 1. Create branch
git checkout -b feature/chat

# 2. Asegurar acceso a:
#    - Supabase SQL Editor
#    - 2 test users (or create)
#    - 2 devices/emulators

# 3. Tener listos:
#    - Este documento: DIA_2_CHAT_DETAILED_PLAN.md
#    - Supabase console abierto
#    - VS Code + terminal
```

### Verificaciones rápidas hoy:

```bash
# Verificar estructura
ls src/hooks        # Deben estar: useAuth.ts, etc
ls src/screens      # Espacios disponibles
ls src/services     # Deben estar: supabase.ts, etc

# Verificar BD acceso
# → Ir a Supabase, verificar login OK
```

---

## 📋 PASO A PASO MAÑANA

### PASO 1 (30 min): Database

**Archivo**: [DIA_2_CHAT_DETAILED_PLAN.md](DIA_2_CHAT_DETAILED_PLAN.md) → PASO 1

```
1. Copy SQL from PASO 1
2. Supabase SQL Editor
3. Paste + RUN
4. Verify: SELECT * FROM messages; (debe existir tabla, 0 rows)
5. Verify trigger creado
6. Done ✅
```

**Checkpoint**: Tabla `messages` existe en BD

---

### PASO 2 (90 min): Service Layer

**Archivo**: [DIA_2_CHAT_DETAILED_PLAN.md](DIA_2_CHAT_DETAILED_PLAN.md) → PASO 2

```
1. Crear archivo: src/services/messages.ts
2. Copy código completo del doc
3. Paste en archivo
4. Check: npm run type-check (sin errores TS)
5. Done ✅
```

**Checkpoint**: `src/services/messages.ts` sin errores

---

### PASO 3 (60 min): Hook Layer

**Archivo**: [DIA_2_CHAT_DETAILED_PLAN.md](DIA_2_CHAT_DETAILED_PLAN.md) → PASO 3

```
1. Crear archivo: src/hooks/useChat.ts
2. Copy código completo del doc
3. Paste en archivo
4. Check: npm run type-check (sin errores)
5. Done ✅
```

**Checkpoint**: `src/hooks/useChat.ts` sin errores

---

### PASO 4 (150 min): UI Components

**Archivo**: [DIA_2_CHAT_DETAILED_PLAN.md](DIA_2_CHAT_DETAILED_PLAN.md) → PASO 4

```
1. Crear: src/components/ChatBubble.tsx
2. Copy código + paste
3. Crear: src/screens/ChatScreen.tsx
4. Copy código + paste
5. Check: npm run type-check (sin errores)
6. Done ✅
```

**Checkpoint**: Componentes compilan

---

### PASO 5 (30 min): Navigation

**Archivo**: [DIA_2_CHAT_DETAILED_PLAN.md](DIA_2_CHAT_DETAILED_PLAN.md) → PASO 5

```
1. Abrir: src/navigation/AppNavigator.tsx
2. Add import: import { ChatScreen } from '../screens/ChatScreen'
3. Add en Stack:
   <Stack.Screen name="Chat" component={ChatScreen} />
4. Done ✅
```

**Checkpoint**: App compila sin errores

---

### PASO 6 (90 min): Testing

**Archivo**: [DIA_2_CHAT_DETAILED_PLAN.md](DIA_2_CHAT_DETAILED_PLAN.md) → PASO 6

```
Setup: 2 devices/emuladores

TEST 1: Message send
  Dev A: Open Chat → Find User2 → Type "Hola" → Send
  Dev B: Should see "Hola" en ~2 segundos ✅

TEST 2: Unread badges
  Dev B: Should see badge with "1" ✅

TEST 3: Mark as read
  Dev B: Open chat → Badge disappears ✅

TEST 4: Conversations list
  Dev A: Should see chat in list ✅

If ALL pass → Listo! ✅
```

**Checkpoint**: 2 users can chat

---

## 🚨 IF SOMETHING BREAKS

### Compilación error (TypeScript)

```bash
# Ver error completo
npm run type-check

# Solución típica: Import faltante
# Agregar: import { useChat } from '../hooks/useChat'
```

### BD error

```sql
-- Ver si tabla existe
SELECT * FROM information_schema.tables 
WHERE table_name = 'messages';

-- Si no existe, re-run SQL from PASO 1
```

### App no arranca

```bash
# Clean cache
rm -rf node_modules/.expo

# Restart
npm start -- --reset-cache
```

### Testing falla (no ve mensajes)

```
Verifica:
1. ¿Ambos users logueados? ✅
2. ¿2 segundo delay para polling? ✅
3. ¿Diferente user_id para cada? ✅
4. ¿Tabla tiene datos? SELECT * FROM messages;
```

---

## ✅ END OF DAY CHECKLIST

```
[ ] Tabla messages creada ✅
[ ] messages.ts sin errores ✅
[ ] useChat.ts sin errores ✅
[ ] ChatBubble + ChatScreen sin errores ✅
[ ] ChatScreen en navigation ✅
[ ] 2 users can send messages ✅
[ ] Unread badges work ✅
[ ] Mark as read works ✅
[ ] Git commit "feat: add chat system" ✅
[ ] Merge a main ✅
```

---

## 📞 IF YOU GET STUCK

### 15 minutos de debugging:

```
1. Read error message completo
2. Google el error
3. Revisar [DIA_2_CHAT_DETAILED_PLAN.md](DIA_2_CHAT_DETAILED_PLAN.md) 
   Sección "ROLLBACK PLAN"
```

### IF STILL STUCK:

```bash
# Rollback everything
git reset --hard main

# Start over (puedes hacer esto sin problema)
git checkout -b feature/chat-v2
```

---

## 🎯 QUICK START - RIGHT NOW IF YOU WANT

Si prefieres empezar AHORA (hoy):

```
1. Leer: [DIA_2_CHAT_DETAILED_PLAN.md](DIA_2_CHAT_DETAILED_PLAN.md) completo (2 hours)
2. PASO 1: Create messages table (30 min)
3. PASO 2: Create messages.ts (90 min)
4. Parar aquí, continuar mañana

→ Avanzar sin apurarse
```

OR

```
1. Esperar mañana 09:00
2. Team sync (15 min)
3. Empezar PASO 1 en equipo
```

---

## 📊 TRACKING

**Mañana al final, reportar**:

```
Chat Implementation Day 2 - Status Report:

✅ Completado:
- PASO 1: BD ✅
- PASO 2: Service ✅
- PASO 3: Hook ✅
- PASO 4: UI ✅
- PASO 5: Navigation ✅
- PASO 6: Testing ✅

⏳ Issues encontrados:
- (none if all OK)

🎉 Ready for:
- DÍA 3: Push Android
```

---

## 🚀 AFTER MAÑANA

Once Chat is done:

**DÍA 3**: Push Android notifications
- Tiempo: 4-6 hours
- Archivo: [DIA_3_PUSH_ANDROID_DETAILED_PLAN.md](DIA_3_PUSH_ANDROID_DETAILED_PLAN.md)

**DÍA 4**: Admin Dashboard (si hay tiempo)
- Tiempo: 4-5 hours
- Includes: Document approval screen

**DÍA 5-7**: QA + Fixes + Launch

---

## 💪 VAMOS!

Status: 🟢 READY TOMORROW

**Documentos necesarios en mano:**

1. ✅ [ROADMAP_FINAL_7_DIAS.md](ROADMAP_FINAL_7_DIAS.md) - Visión general
2. ✅ [DIA_2_CHAT_DETAILED_PLAN.md](DIA_2_CHAT_DETAILED_PLAN.md) - Blueprint detallado
3. ✅ Este doc - Quick reference

**Mañana 09:00**: Team sync + start

Let's ship Chat. 🎯

