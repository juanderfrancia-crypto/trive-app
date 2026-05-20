# 🚀 HOY EMPEZAMOS - GUÍA DE ACCIÓN INMEDIATA

**Fecha:** Hoy mismo (20 de Abril)  
**Duración:** Esta guía te toma 5 min leer  
**Próximo paso:** Empezar en 10 min

---

## ✅ CHECKLIST DE INICIO (5 MIN)

```
[ ] Abriste VS Code con la carpeta trive-app
[ ] Tienes terminal abierta
[ ] Leíste PLAN_PRAGMATICO_2_PERSONAS.md
[ ] Tienes SOLUCIONES_ERRORES_TYPESCRIPT.md abierto
[ ] Café en mano ☕
```

---

## 🎯 PLAN HOY (SEMANA 1, DÍA 1)

### FASE 1: Setup (10 min)
```bash
# Terminal:
cd C:\Users\T460s\trive-app
git status                    # Verificar todo limpio
npx tsc --noEmit 2>&1 | head -20  # Ver cuántos errores hay
```

### FASE 2: Borrar Componentes (5 min)
```bash
# Elimina estos 3 archivos:
rm src/components/IMPROVED_CHAT_BUBBLE.tsx
rm src/components/IMPROVED_CONVERSATION_ITEM.tsx
rm src/components/IMPROVED_MESSAGE_INPUT.tsx

# Verifica que no se importan:
grep -r "IMPROVED_" src/

# Si no hay output = listo! ✅
```

### FASE 3: Compilar (2 min)
```bash
npx tsc --noEmit
# Deberías ver MENOS errores que antes
```

### FASE 4: Primer Commit (1 min)
```bash
git add .
git commit -m "chore: remove deprecated IMPROVED_* components"
git push
```

**TIEMPO TOTAL: ~18 min** 🎉

---

## 📝 TAREAS DE HOY (Siguiente 3-4 horas)

Después del café, haz esto EN ESTE ORDEN:

### Tarea 1: Actualizar theme.ts (2h)
```
Archivo: src/theme/theme.ts

Agregar estas properties a colors:
├─ secondary: '#6B7280'
├─ text: '#1F2937'
├─ dark: '#111827'
└─ (y otras que falten, ver ERROR 5 en SOLUCIONES_ERRORES_TYPESCRIPT.md)

Agregar estas properties a typography:
├─ body2
├─ caption
├─ button
├─ subtitle1
├─ subtitle2
├─ labelSmall
└─ (copiar structure de h1, h2, etc)

Comando para ver qué falta:
npx tsc --noEmit 2>&1 | grep "Property"
```

**Hints:**
- Copia estructura de propiedades existentes
- Los valores (colores, tamaños) son approximados, lo importante es que existan
- Test cada fix: `npx tsc --noEmit` y ve si baja el # de errores

### Tarea 2: Fijar ChatBubble.tsx (1h)
```
Archivo: src/components/ChatBubble.tsx

Buscar: flexDirection: direction
Problema: direction es string, debe ser tipo literal

Solución (en línea 105):
ANTES:
  <View style={[
    { flexDirection: direction }
  ]}>

DESPUÉS:
  <View style={[
    isOwn 
      ? { flexDirection: 'row-reverse' as const }
      : { flexDirection: 'row' as const }
  ]}>
```

### Tarea 3: Fijar Icons (30 min)
```
Buscar estos archivos:
├─ src/screens/ActiveTripsScreen.tsx línea 310
├─ src/screens/ContactRequestsScreen.tsx línea 105
└─ src/components/OfflineBanner.tsx línea 28

Reemplazamientos:
"chair-outline" → "car-outline"
"inbox-outline" → "email-outline"
"wifi-off" → "wifi-off" (este ya es válido, skip)
```

### Tarea 4: Otros Tipos (30 min)
```
Ver: SOLUCIONES_ERRORES_TYPESCRIPT.md

Buscar y fijar:
├─ animationEnabled → quitar (no válido en React Navigation v6)
├─ User.name → cambiar a email o profile.full_name
├─ stopAsync() → finishRecordingAsync()
└─ string vs string[] → envolver en array

Usa `grep` para encontrar:
grep -r "animationEnabled" src/
grep -r "stopAsync" src/
grep -r "User\.name" src/
```

### Tarea 5: Verify (30 min)
```bash
# Al final del día:
npx tsc --noEmit

# Goal: Ver número de errores que bajó
# Ejemplo:
#   Inicio: 100 errores
#   Después: 50 errores
#   = 50 errores menos! ✅
```

---

## 🎮 VS CODE KEYBOARD SHORTCUTS

Mientras trabajas:

```
Ctrl+Shift+F    → Find in files (busca error específico)
Ctrl+H          → Find & Replace (fix múltiples)
Ctrl+`          → Terminal integrada
Ctrl+K Ctrl+0   → Collapsa todas las carpetas
Ctrl+/          → Toggle comment
Alt+Up/Down     → Move línea arriba/abajo
Ctrl+D          → Select next occurrence (fix 5x a la vez)
```

---

## 💡 SI ESTÁS ATASCADO

**Situación 1:** "No sé dónde está el error"
```
Usa: grep -r "text-de-error" src/
Ej: grep -r "activeOpacity" src/
```

**Situación 2:** "No sé cómo arreglarlo"
```
1. Abre SOLUCIONES_ERRORES_TYPESCRIPT.md
2. Busca el ERROR que corresponde
3. Sigue el código exacto
```

**Situación 3:** "Sigo teniendo el mismo error"
```
1. Verifica que GUARDASTE el archivo (Ctrl+S)
2. Ejecuta: npx tsc --noEmit nuevamente
3. Si persiste: abre el archivo, copia el error exacto
4. Preguntame (la IA): "Tengo este error..."
```

---

## 📊 PROGRESO HOY

Antes de irte:

```bash
# Ver cuántos errores bajaron
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# Si fue de 100 a 70 = ÉXITO ✅
# Si llegó a 0 = INCREÍBLE 🎉
```

Crea archivo `PROGRESS.md` con:
```markdown
# Progreso Diario

## Día 1 (Hoy)
- [x] Setup + primera phase
- [x] Eliminados 3 componentes deprecated
- [x] Started actualizar theme.ts
- [x] Fijados algunos icons

Errores: 100 → 70 ✅

Próximo:
- Completar theme.ts
- Fijar ChatBubble types
```

---

## 🕐 HORARIO SUGERIDO

```
09:00 - 09:30: Lee esta guía
09:30 - 10:00: FASE 1-4 (setup + commit)
10:00 - 12:30: Tarea 1-2 (theme + ChatBubble)
12:30 - 13:30: Almuerzo
13:30 - 14:30: Tarea 3-4 (icons + tipos)
14:30 - 15:00: Verify + commit
15:00+: Descanso o continúa si tienes energía
```

---

## 🚨 NO HAGAS ESTO

```
❌ No intentes fijar TODO hoy
   └─ 100 errores = 3-5 días

❌ No hagas cambios sin entender
   └─ Leer primero, luego copiar código

❌ No ignores los errores
   └─ Compilación limpia es prerequisito

❌ No trabajes sin git
   └─ Commit FRECUENTEMENTE (cada error fijo)

❌ No olvides descansar
   └─ Quemarse día 1 = fracaso

✅ SÍ hagas commit cada tarea
✅ SÍ toma breaks cada hora
✅ SÍ testea `npx tsc` cada fix
```

---

## 📞 SOPORTE INMEDIATO

Si necesitas ayuda mientras programas:

**Opción 1:** "Estoy acá con [error específico]"
```
Yo ayudo en segundos
```

**Opción 2:** "No entiendo esto"
```
Yo explico hasta que entiendas
```

**Opción 3:** "Se rompió algo"
```
Yo debugueo contigo
```

**Nunca** deberías estar esperando horas. Es un maratón, pero hoy es importante empezar fuerte.

---

## 🎯 META DEL DÍA

```
Cuando termines hoy:
1. App compila con MENOS errores ✅
2. 3+ commits realizados ✅
3. 70+ horas mañana relajado sin presión ✅
4. Entiendes el sistema de errores ✅

= DÍA PRODUCTIVO
```

---

## 🔄 MAÑANA

Mañana (Martes) empezás donde terminaste hoy.

Si llegas a compilar 100% hoy: INCREÍBLE 🎉  
Si llegas a 50%: MUY BIEN ✅  
Si llegas a 25%: EXCELENTE (es mucho trabajo) 👍

Lo importante: progreso consistente, no perfección en el día 1.

---

## 🚀 LET'S GO

```
┌────────────────────────────────┐
│  Abre la terminal              │
│  cd trive-app                  │
│  npm start                      │
│                                │
│  Y empezá a codear 💪          │
│                                │
│  Yo estoy acá cuando necesites │
└────────────────────────────────┘
```

¿Listo? Pregunta cualquier cosa antes de empezar.

