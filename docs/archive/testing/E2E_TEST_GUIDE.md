# 🧪 Trive App - End-to-End Testing Guide

Complete testing flow for the full MVP: Register → Search → Select Seat → Confirm Booking

---

## 📋 Prerequisites

### 1. Prepare Test Data in Supabase
- Run `TEST_DATA.sql` in Supabase SQL Editor
- Create two auth users:
  - **Conductor**: conductor@test.com / TestPass123!
  - **Passenger**: pasajero@test.com / TestPass123!
- Note the UUIDs and update TEST_DATA.sql with actual UUIDs
- Verify data exists in routes, profiles, drivers tables

### 2. Setup Development Environment
```bash
cd trive-app
npm install
npm start  # or expo start
```

### 3. Select Device
- iOS Simulator: Press `i`
- Android Emulator: Press `a`
- Web: Press `w`

---

## 🧑‍💻 Test Scenario 1: New User Registration + Complete Booking

### Step 1: **Register New User**
**Screen**: LoginScreen → RegisterScreen

- [ ] Tap "¿No tienes cuenta? Regístrate aquí"
- [ ] Fill form:
  - **Name**: Juan Pérez (3+ chars)
  - **Email**: juan@test.com (valid format)
  - **Phone**: 3001234567 (10+ digits)
  - **Password**: SecurePass123! (8+ chars)
  - **Confirm**: Same password
- [ ] Tap "Crear Cuenta"
- [ ] ✅ **Expected**: Profile created, redirected to Home
- [ ] ✅ **Verify**: User data shows in ProfileScreen

### Step 2: **Search Available Routes**
**Screen**: HomeScreen → SearchScreen

- [ ] Tap "Search" tab
- [ ] ✅ **Expected**: Routes load (3 routes from test data)
- [ ] **Route List Shows**:
  - ✓ Puerto Tejada → Cali (5 asientos)
  - ✓ Cali → Bogotá (4 asientos)
  - ✓ Cali → Medellín (6 asientos)
- [ ] All show:
  - Origin & Destination
  - Vehicle: Model, Year, Color
  - Price per seat
  - Available seats
  - Driver rating and name

### Step 3: **Filter Routes (Optional)**
**In SearchScreen**:

- [ ] Type "Cali" in search box
- [ ] ✅ **Expected**: Show only routes to/from Cali (2 routes)
- [ ] Type "Bogota"
- [ ] ✅ **Expected**: Show only Cali → Bogotá route (1 route)
- [ ] Toggle "Solo con asientos disponibles"
- [ ] ✅ **Expected**: All routes still visible (all have available seats)

### Step 4: **Select Route**
**In SearchScreen**:

- [ ] Tap on "Puerto Tejada → Cali" route card
- [ ] ✅ **Expected**: Navigate to SeatSelectionScreen
- [ ] Verify route data displays correctly:
  - Vehicle: Nissan Urvan 2023 Gris
  - Plate: PTX-234
  - Driver: Rodrigo Vargas ⭐4.8 (124 viajes)

### Step 5: **Select Seat**
**Screen**: SeatSelectionScreen

- [ ] ✅ **Expected**: Shows 5 seats (all available - first time)
- [ ] Visual check:
  - ✓ Seats 1-5 are BLUE (available)
  - ✓ Driver seat shows "Chofer" label
  - ✓ Legend shows green = disponible, gray = ocupado
- [ ] Tap seat **#3**
- [ ] ✅ **Expected**: Seat border becomes GOLD/accent color
- [ ] ✅ **Expected**: Button changes to "Continuar - Asiento 3"
- [ ] Verify summary:
  - Asientos disponibles: 5 de 5
  - Precio por asiento: $5.500

### Step 6: **Proceed to Booking**
**Button**: "Continuar - Asiento 3"

- [ ] Tap button
- [ ] ✅ **Expected**: Navigate to BookingScreen
- [ ] Route & seat data persists:
  - Puerto Tejada → Cali ✓
  - Asiento #3 ✓
  - Conductor: Rodrigo Vargas ✓

### Step 7: **Confirm Booking**
**Screen**: BookingScreen

- [ ] Verify user data auto-filled:
  - Name: Juan Pérez ✓
  - Phone: 3001234567 ✓
- [ ] Verify trip summary:
  - **Ruta**: Puerto Tejada → Cali
  - **Asiento**: #3
  - **Precio viaje**: $5.500
  - **Cuota de servicio (20%)**: $1.100
  - **Total**: $6.600
- [ ] Payment method: Cash (selected by default)
- [ ] ✅ **Verify**: Card option is grayed out (v1 feature)
- [ ] Tap "Confirmar Reserva"
- [ ] ✅ **Expected**: 
  - Booking saved to DB
  - Navigate to TripStatusScreen
  - No errors/alerts

### Step 8: **View Trip Status**
**Screen**: TripStatusScreen

- [ ] ✅ **Expected**: Trip information displays:
  - Status badge: "En espera"
  - Route: Puerto Tejada → Cali
  - Vehicle: Nissan Urvan, PTX-234, Gris
  - Driver: Rodrigo Vargas ⭐4.8
- [ ] Seat occupancy shows:
  - **Cupos**: 1 de 5 ocupados (Juan's seat)
  - Seat #3: "Tu asiento" (highlighted in gold)
  - Other seats: Available
  - Progress bar: 20% filled
- [ ] Trip info shows:
  - Hora salida: ~[current time + 1 hour]
  - Tarifa: $5.500
  - Fecha: [today's date]
- [ ] Action buttons visible:
  - Call button (green) ✓
  - Message button (blue) ✓
  - Cancel booking button ✓

### Step 9: **Verify Booking in Profile**
**Screen**: ProfileScreen

- [ ] Tap "Profile" tab
- [ ] ✅ **Expected**: User data persists:
  - Name: Juan Pérez
  - Email: juan@test.com
  - Estadísticas section updates (if implementing)
- [ ] Tap "Mis viajes" (when implemented)
- [ ] ✅ **Expected**: Booking shows in list

---

## 🧑‍💼 Test Scenario 2: Existing Conductor Login

### Step 1: **Logout Previous User**
**Screen**: ProfileScreen

- [ ] Tap "Cerrar Sesión"
- [ ] Confirm dialog
- [ ] ✅ **Expected**: Clear auth, redirect to LoginScreen

### Step 2: **Login as Conductor**
**Screen**: LoginScreen

- [ ] Email: conductor@test.com
- [ ] Password: TestPass123!
- [ ] ✅ **Expected**: Login success, see HomeScreen
- [ ] Role: Conductor (if showing)

### Step 3: **Switch to Driver Mode**
**Screen**: ProfileScreen

- [ ] Tap "Conductor" button in mode selector
- [ ] ✅ **Expected**: Shows driver section
- [ ] Vehicle status: "Sin vehículo registrado"
- [ ] Option to register vehicle

---

## 🔍 Test Data Integrity Checks

After completing booking, verify in Supabase:

### SQL Queries to Run:

```sql
-- Check booking was created
SELECT * FROM bookings WHERE passenger_id = 'juan-uuid';
-- Expected: 1 row with seat_number=3, price=5500, status='confirmed'

-- Check available_seats decreased
SELECT id, available_seats FROM routes WHERE id = 'route-uuid-1';
-- Expected: available_seats = 4 (was 5, now -1)

-- Check route bookings
SELECT seat_number, booking_status FROM bookings 
WHERE route_id = 'route-uuid-1';
-- Expected: seat_number=3, status='confirmed'
```

---

## ✅ Checklist: All MVP Features Working

- [x] **Authentication**
  - [ ] Register new user
  - [ ] Login existing user
  - [ ] Logout redirects to LoginScreen

- [x] **Search Routes**
  - [ ] Routes load from BD
  - [ ] Search filters by origin/destination
  - [ ] Available seats filter works
  - [ ] Route card shows all info

- [x] **Seat Selection**
  - [ ] Seats load from route.total_seats
  - [ ] Occupied seats marked (from bookings)
  - [ ] Can select available seat
  - [ ] Selected seat highlighted visually
  - [ ] "Continuar" button shows seat number

- [x] **Booking Confirmation**
  - [ ] User data pre-filled
  - [ ] Trip summary correct
  - [ ] Service fee calculated (20%)
  - [ ] Payment method selector visible
  - [ ] Booking saves to DB

- [x] **Trip Status**
  - [ ] Trip info displays
  - [ ] Seat occupancy updates
  - [ ] Driver info shows
  - [ ] Contact buttons visible

- [x] **Profile**
  - [ ] User info displays
  - [ ] Mode switcher works
  - [ ] Logout button functional
  - [ ] Stats visible

---

## 🐛 Known Issues & Workarounds

### Email Rate Limiting
- **Issue**: "email rate limit exceeded" on register
- **Workaround**: Wait 1+ hour or use different email

### Empty Routes on First Search
- **Issue**: Routes don't load
- **Workaround**: 
  - Verify TEST_DATA.sql ran successfully
  - Check Supabase routes table has data
  - Clear app cache and restart

### Selected Seat Not Persisting
- **Issue**: Lost when navigating back
- **Workaround**: Zustand store should persist - check browser console for errors

### Payment Method Disabled
- **Info**: Card payment disabled for v1 - see comments in BookingScreen

---

## 📸 Screenshots to Capture

For documentation:
1. RegisterScreen with valid data
2. SearchScreen with routes list
3. SeatSelectionScreen with selection
4. BookingScreen confirmation
5. TripStatusScreen with live data
6. ProfileScreen with stats

---

## 🚀 Next Steps After MVP Validation

- [ ] Payment gateway integration (Stripe/Mercado Pago)
- [ ] Real-time tracking with Google Maps
- [ ] Push notifications for trip updates
- [ ] Review system for drivers/passengers
- [ ] Driver registration flow (DriverRegisterScreen)
- [ ] Chat between driver and passenger
- [ ] Analytics dashboard

---

## 📞 Support

If issues occur:
1. Check console logs in Expo DevTools
2. Verify Supabase connection: Open DevTools → Network tab
3. Check RLS policies allow your user role
4. Verify auth token is valid: Store > setAuthUser should not be null

