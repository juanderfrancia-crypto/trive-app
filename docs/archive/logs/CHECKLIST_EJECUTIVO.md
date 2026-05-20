# ✅ CHECKLIST EJECUTIVO - QUÉ HACER PRIMERO

## 🎯 EN LOS PRÓXIMOS 30 MINUTOS

Esto debe hacerse YA, antes de empezar el sprint de 7 días.

### 1. Leer Análisis
- [ ] Leer `MVP_ASSESSMENT.md` (5 min) - Veredicto: 6.5/10, LANZABLE en 5-7 días
- [ ] Leer `ARCHITECTURE_DECISIONS.md` (5 min) - Decisiones técnicas finales
- [ ] Leer `7DAY_SPRINT_PLAN.md` (10 min) - Plan detallado día a día

**Output esperado**: Conocer qué falta, cuál es el plan, qué riesgos hay

---

### 2. Decisiones Críticas (5 min)

**PREGUNTA 1: ¿Cuántos testers disponibles?**
- [ ] 3-5 testers OK
- [ ] 5-10 testers MEJOR
- [ ] 50+ testers podemos ir más agresivo

**PREGUNTA 2: ¿Cuál es el presupuesto?**
- [ ] $0: Cash only, ignore Mercado Pago
- [ ] $100-500: Mercado Pago OK + Google Maps API
- [ ] $1000+: Considerar todas las opciones

**PREGUNTA 3: ¿Target de usuarios para beta?**
- [ ] 50 (mini) 
- [ ] 500 (mid)
- [ ] 5000 (basta para feedback)

---

### 3. Crear Equipo (10 min)

**Roles necesarios** (puedes hacer múltiples):

```
BACKEND (8 horas totales)
- [ ] Persona 1: Race condition + DB setup
      Tiempo: Half day (2 horas setup + 2 horas testing)
      
- [ ] Persona 2: Payments + Coordenadas
      Tiempo: Half day (4 horas)

FRONTEND (8 horas totales)
- [ ] Persona 1: Google Maps integration
      Tiempo: Half day (2 horas)
      
- [ ] Persona 2: Payment UI + Optimizaciones
      Tiempo: Half day (2 horas)

QA (8 horas totales)
- [ ] Lead: Test plan + coordinación
      Tiempo: Day 4 (8 horas)
      
- [ ] Tester 1-2: Ejecutar tests
      Tiempo: Day 4-5 (16 horas total)

DEVOPS (4 horas totales)
- [ ] Build APK/IPA + monitoring setup
      Tiempo: Day 5 (4 horas)

PRODUCT (5 horas totales)
- [ ] Beta user recruitment + feedback
      Tiempo: Ongoing
```

**Total equipo mínimo**:
- 1 backend engineer
- 1 frontend engineer  
- 1 QA person
- 1 DevOps (part-time)
- 1 PM (part-time)

---

## ✅ PRIMER DÍA - CHECKLIST

### Mañana (4 horas)

#### TAREA 1: Race Condition Fix
```
[ ] BACKEND: Abrir Supabase SQL Editor
[ ] Ejecutar: Consulta para checking constraint exists
[ ] Ejecutar: ALTER TABLE bookings ADD UNIQUE...
[ ] Verificar: constraint está en tabla

[ ] FRONTEND: Abrir useBookings.ts
[ ] Agregar: Try-catch para error código 23505
[ ] Test: Simular 2 tabs, mismo asiento
[ ] Verificar: Solo 1 booking creado
```

**Evidencia de completado**: Screenshot BD + test pasando

---

#### TAREA 2: DB Setup (pg_cron)
```
[ ] BACKEND: IDE/Editor abierto en BOOKING_STATUS_AUTO_UPDATE.sql
[ ] Copiar SQL completo
[ ] Pegar en Supabase SQL Editor
[ ] Ejecutar sin errores
[ ] Verificar: cron.job table muestra 1 job
```

**Evidencia**: Screenshot de `SELECT * FROM cron.job`

---

### Tarde (4 horas)

#### TAREA 3: Testing Integración
```
[ ] QA: Crear ruta de prueba (departure time = ayer)
[ ] Crear booking con status 'confirmed'
[ ] Esperar 5 min (o trigger manual si Supabase permite)
[ ] Verificar: Status cambió a 'completed'
[ ] En app: TripHistory muestra la ruta
```

**Evidencia**: Screenshot app mostrando ruta en historial

---

## ✅ UNA VEZ COMPLETADO DÍA 1

Todos se reúnen (5 min) para:

1. **Verificar status**:
   - [ ] Race condition arreglada
   - [ ] DB setup funciona
   - [ ] Booking history actualiza solo

2. **Celebrar 🎉** - Primera parte crítica DONE!

3. **Decidir siguiente**:
   - [ ] Si todo OK → Proceder a DÍA 2 (Pagos)
   - [ ] Si problemas → Hotfix hoy, push schedule 1 día

---

## 🚀 QUICK START - COMMAND LINE

**Para backend (SQL Setup)**:
```bash
# 1. Ver todas tablas
SELECT * FROM information_schema.tables WHERE table_schema = 'public';

# 2. Verificar bookings tiene race condition fix
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'bookings';

# 3. Verificar cron está activo
SELECT * FROM cron.job;

# 4. Ver logs de cron (si erro)
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
```

**Para frontend (Testing)**:
```bash
cd trive-app

# 1. Instalar dependencias si no está
npm install

# 2. Start Expo
expo start

# 3. Escanear QR en device o emulador

# 4. Testing: Open 2 Expo sessions, same route, same seat
```

---

## 📊 TRACKING DIARIO

Cada mañana (5 min meeting):

### DÍA 1 ✅
```
Meta: Race condition + DB setup
Status: [ON TRACK / DELAYED / BLOCKED]
Blockers: (si alguno)
Proof: (screenshots/evidence)
```

### DÍA 2 ✅
```
Meta: Payments (CASH) setup
Status: 
Blockers: 
Proof: 
```

### DÍA 3 ✅
```
Meta: GPS/Maps integration
Status: 
Blockers: 
Proof: 
```

### DÍA 4 ✅
```
Meta: QA + testing
Status: 
Critical bugs found: (lista)
Proof: 
```

### DÍA 5 ✅
```
Meta: Build + deploy
Status: 
Crashes reported: (si alguno)
Proof: 
```

---

## 🎯 WEEKLY DECISION GATES

| Gate | Criteria | If PASS | If FAIL |
|------|----------|---------|---------|
| **Day 1** | Race condition arreglada, DB setup OK | → Continuar Day 2 | → Hotfix, push 1 día |
| **Day 2** | Payments funciona, al menos CASH | → Continuar Day 3 | → Simplificar, Cash only |
| **Day 3** | Maps muestra sin crashes | → Continuar QA | → Usar embed estático |
| **Day 4** | < 3 critical bugs encontrados | → Proceder deploy | → Delay launch 2 días |
| **Day 5** | Crash rate < 2%, uptime 99%+ | → LANZAR BETA | → Hotfix 1 más día |

---

## 🚨 BLOCKER RESOLUTION

Si encuentras blocker:

```
BLOCKER ENCONTRADO
    ↓
¿Puedo fix en < 30 min? 
    ├─ SÍ → Fix ahora, continuar
    └─ NO → Escalate a tech lead
           ↓
       Tech lead decide:
       ├─ A) Dedicate recursos extra
       ├─ B) Workaround (skip feature)
       └─ C) Push timeline
```

---

## 📱 DEVICES PARA TESTING

Necesitas testear en:
- [ ] Android phone (real)
- [ ] iPhone/iPad (real) - si tienes acceso
- [ ] Android emulator (si no tienes device)
- [ ] iOS emulator (Mac only)

**Mínimo**: 1 Android device real

---

## 💬 COMUNICACIÓN EQUIPO

### Daily standup (5 min, 10 AM)
```
Cada persona:
"Ayer hice X, hoy haré Y, tengo blocker Z"
```

### Escalation (ASAP)
```
Si algo toma > 30 min sin progress:
Slack: #trive-sprint → "BLOCKER: [ISSUE]"
Tech lead responde en < 15 min
```

### Nightly release (4 PM)
```
Frontend
Backend  } Build + test, report status
QA
```

---

## 🎁 BONUS: PRE-LAUNCH CHECKLIST

**Day 6-7 (antes de lanzar)**

```
[ ] Todos bugs reportados tiene fix
[ ] Changelog documentado (qué está en MVP vs no)
[ ] User guide escrito (paso a paso)
[ ] Feedback form creado (para testers)
[ ] Respuesta team 24/7 (sobre quién está on-call?)
[ ] Términos & Condiciones listo
[ ] Política privacidad listo
[ ] Emergency contact list (CEO + tech lead + ops)

Si TODO ✅: LANZAR 🚀
Si alguno ❌: Esperar 1 día más
```

---

## 📞 QUERIES - PREGUNTAS FRECUENTES

### "No tengo Android device, ¿qué hago?"
→ Usar Android Studio Emulator (gratuito), o pedir prestado device

### "¿Mercado Pago es obligatorio?"
→ NO. MVP1 = Cash. MP es MVP2. Sigue adelante con Cash.

### "Si Day 4 QA encuentra 5+ bugs críticos?"
→ Delay 2 días más. La prisa = más bugs en producción.

### "¿Tengo que hacer TODOS los docs?"
→ NO. Mínimo: Este checklist + 7DAY_SPRINT_PLAN.md

### "¿Cuál es el timeout máximo por tarea?"
→ Si algo toma 2x lo estimado: Escalar. No intentes solo.

---

## 🎬 ACTION NOW (NEXT 5 MIN)

```
1. [ ] Asigna backend engineer para TAREA 1
2. [ ] Asigna frontend engineer para testing
3. [ ] Marca en calendar DAILY STANDUP 10 AM
4. [ ] Copia estos docs a Notion/Confluence (para team)
5. [ ] Reacciona con 👍 en Slack cuando listo
```

---

## 📅 TIMELINE FINAL

```
TODAY (Hora 0):     Lee documentos + asigna equipo
DÍA 1 (Mañana):     Race condition + DB setup
DÍA 2 (Pasado):     Payments funciona
DÍA 3 (Próxima S):  GPS integrado
DÍA 4 (Sábado):     QA intenso - 50+ test cases
DÍA 5 (Domingo):    Build APK + monitoring
DÍA 6 (Lunes):      Hotfixes
DÍA 7 (Martes):     🚀 LANZAR BETA
```

---

**VERSIÓN**: 1.0  
**ÚLTIMA ACTUALIZACIÓN**: 7 de abril  
**ESTADO**: 🟢 READY TO EXECUTE

---

## 💪 MOTIVACIÓN

Hace 6 meses esta app no existía. Hoy está 37% lista. En 7 días va a estar EN LAS MANOS DE USUARIOS REALES. 

**Eso es software.**

Vamos a hacerlo. 🚀

---

*"Done is better than perfect" - Facebook*  
*"Ship it." - Every CEO ever*

---
