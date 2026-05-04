# Testing DriverRegisterScreen (Route Creation)

## Prerequisites
- App running after successful login as a **Conductor**
- Supabase project configured
- DATABASE with `routes` table ready

## How to Access the Screen

1. **Login** to the app with any user
2. Go to **Profile Screen** (bottom right tab)
3. Toggle to **Conductor** (driver mode) 
4. Click **"Registrar como Conductor"** button
5. **DriverRegisterScreen** opens

## Form Fields to Fill

### Section 1: Detalles de la ruta (Route Details)
| Field | Example | Rules |
|-------|---------|-------|
| Origen | Bogotá | Required, any text |
| Destino | Medellín | Required, any text |
| Salida | 08:30 | Required, format HH:MM |
| Llegada | 12:45 | Required, format HH:MM |

### Section 2: Asientos y tarifa (Seats & Price)
| Field | Example | Rules |
|-------|---------|-------|
| Total asientos | 5 | Required, 1-8 only |
| Precio por asiento | 45000 | Required, positive number |

**Live Summary Display:**
- Shows: "Asientos disponibles: 5"
- Shows: "Ingreso total (estimado): $225,000"

### Section 3: Datos del vehículo (Vehicle Data)
| Field | Example | Rules |
|-------|---------|-------|
| Marca | Toyota | Required |
| Año | 2020 | Required, 4 digits |
| Placa | PTX234 | Required, auto-uppercase |
| Color | Blanco | Required |

## Test Scenario 1: Happy Path (Success)

**Input Data:**
```
Origen: Bogotá Centro
Destino: Medellín
Salida: 08:30
Llegada: 12:45
Total asientos: 4
Precio por asiento: 50000
Marca: Toyota
Año: 2020
Placa: ABX234
Color: Negro
```

**Expected Result:**
1. ✅ Form validates all fields
2. ✅ Loading spinner appears on "Publicar Ruta" button
3. ✅ Route is created in Supabase (check `routes` table)
4. ✅ Success alert: "¡Ruta creada correctamente! Los pasajeros ya pueden verla y reservar."
5. ✅ Click "Ir al inicio" → returns to Main screen
6. ✅ Form clears (all fields empty)

**Database Verification:**
```sql
SELECT * FROM routes 
WHERE driver_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 1;
```
Should show your newly created route with:
- origin: "Bogotá Centro"
- destination: "Medellín"
- departure_time: "2026-04-04T08:30:00"
- arrival_time: "2026-04-04T12:45:00"
- total_seats: 4
- available_seats: 4
- price_per_seat: 50000
- vehicle_make: "Toyota"
- vehicle_year: 2020
- vehicle_plate: "ABX234"
- vehicle_color: "Negro"
- status: "scheduled"

## Test Scenario 2: Validation Errors

**Test 2.1: Missing Origin**
- Leave "Origen" empty
- Fill all other fields
- Click "Publicar Ruta"
- ❌ Expected: Alert "Error: Por favor ingresa el origen"

**Test 2.2: Invalid Time Format**
- Salida: "830" (missing colon)
- Fill all other fields
- Click "Publicar Ruta"
- ❌ Expected: Alert "Error: Por favor ingresa la hora de salida (ej: 08:30)"

**Test 2.3: Invalid Seats**
- Total asientos: "9" (exceeds max 8)
- Fill all other fields
- Click "Publicar Ruta"
- ❌ Expected: Alert "Error: Por favor ingresa asientos válidos (1-8)"

**Test 2.4: Invalid Price**
- Precio por asiento: "0" or "-50000"
- Fill all other fields
- Click "Publicar Ruta"
- ❌ Expected: Alert "Error: Por favor ingresa un precio válido"

**Test 2.5: Invalid Year**
- Año: "20" (not 4 digits)
- Fill all other fields
- Click "Publicar Ruta"
- ❌ Expected: Alert "Error: Por favor ingresa un año válido (ej: 2020)"

**Test 2.6: Missing Vehicle Details**
- Leave "Placa" empty
- Fill all other fields
- Click "Publicar Ruta"
- ❌ Expected: Alert "Error: Por favor ingresa la placa del vehículo"

## Test Scenario 3: Real-time Summary Updates

1. Enter:
   - Total asientos: (leave empty)
   - Precio por asiento: (leave empty)
   - **Result:** No summary box displayed

2. Enter:
   - Total asientos: 3
   - Precio por asiento: (still empty)
   - **Result:** Still no summary (missing price)

3. Enter:
   - Total asientos: 3
   - Precio por asiento: 40000
   - **Result:** Summary displays:
     - Asientos disponibles: 3
     - Ingreso total (estimado): $120,000

4. Update:
   - Total asientos: 5
   - **Result:** Summary updates to:
     - Asientos disponibles: 5
     - Ingreso total (estimado): $200,000

## Test Scenario 4: Cancel Operation

1. Fill partial data (any fields)
2. Click "Cancelar" button
3. **Expected:** 
   - ✅ No navigation (form not submitted)
   - Maybe alert to confirm? (currently just closes)
   - Returns to ProfileScreen

## Test Scenario 5: Verify Route in SearchScreen

After creating a route:

1. **Go back to Main screen**
2. **Switch to Passenger mode** (Profile tab → toggle Pasajero)
3. **Go to SearchScreen** (home icon)
4. **Search for your route:**
   - Origen field: type part of origin (e.g., "Bogotá")
   - Should see your newly created route in the list
   - Shows: origin, destination, departure time, available seats, price
5. **Tap the route** → goes to SeatSelectionScreen
6. **Select a seat** → goes to BookingScreen
7. **Confirm booking** → route appears in TripStatusScreen
8. **Back in DB:** Available seats decreases by 1

## Integration Checklist

- [x] Form validation complete
- [x] Supabase integration via useRoutes().createRoute()
- [x] User ID from Zustand store
- [x] Timestamp generation (current date + input times)
- [x] Error handling with user-friendly alerts
- [x] Loading state during submission
- [x] Success confirmation with navigation
- [x] Form cleanup after success
- [x] Route immediately searchable by passengers
- [x] Real-time seat availability tracking in BookingFlow

## Known Limitations (v2 Features)

- [ ] Document upload/verification (marked for v2)
- [ ] Vehicle photo capture
- [ ] Route editing/cancellation
- [ ] Recurring routes (daily, weekly schedules)
- [ ] Vehicle verification status check
- [ ] Payment method setup for earnings
- [ ] Earnings dashboard integration
