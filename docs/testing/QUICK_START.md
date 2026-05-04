# Trive App - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Prepare Supabase
```bash
# 1. Go to Supabase Dashboard (https://app.supabase.com)
# 2. Select project: iksenkkaxlmdiyeezoym
# 3. Go to SQL Editor
# 4. Create test users:
Email: conductor@test.com | Password: TestPass123!
Email: pasajero@test.com | Password: TestPass123!

# 5. Copy user UUIDs from Auth > Users section

# 6. Run TEST_DATA.sql:
# - Replace 'conductor-uuid-here' with actual conductor UUID
# - Replace 'passenger-uuid-here' with actual passenger UUID (optional)
# - Execute script

# Verify: Check tables > routes, drivers table populated
```

### Step 2: Start Development Server
```bash
cd trive-app
npm install  # (if first time)
npm start    # or: expo start
```

### Step 3: Pick Device
```
Press: i (iOS)
Press: a (Android)
Press: w (Web)
```

### Step 4: Test Full Flow
1. **Register**: New account (or login as pasajero@test.com)
2. **Search**: Browse routes (should see 3 routes)
3. **Select**: Choose any route
4. **Seat**: Pick any seat (e.g., #3)
5. **Confirm**: Book and pay
6. **Verify**: See trip status with real data

---

## 📋 What's Connected to Supabase

✅ **All 7 Main Screens**:
- LoginScreen → useAuth.login()
- RegisterScreen → useAuth.register()
- SearchScreen → useRoutes.fetchRoutes()
- SeatSelectionScreen → useBookings.getRouteBookings()
- BookingScreen → useBookings.createBooking()
- TripStatusScreen → useBookings.getRouteBookings()
- ProfileScreen → useProfile.fetchProfile()

✅ **Global State**: Zustand store syncs with auth

✅ **Database**: 5 tables with RLS, 3 test routes ready

---

## 🧪 Test Scenarios

### Scenario A: New User
```
1. Tap "¿No tienes cuenta?" → RegisterScreen
2. Fill: Name, Email, Phone, Password
3. Create account
4. Search routes
5. Select → Seat → Booking → Trip Status
```

### Scenario B: Existing User
```
1. LoginScreen: conductor@test.com / TestPass123!
2. See ProfileScreen with conductor role
3. Tap Tab > Profile > Conductor mode
```

### Scenario C: Data Persistence
```
1. Search route → Select seat
2. Go back → Search same route
3. Verify seat is marked occupied (if already booked)
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useAuth.ts` | Login/register/logout |
| `src/hooks/useRoutes.ts` | Fetch routes from DB |
| `src/hooks/useBookings.ts` | Create & fetch bookings |
| `src/hooks/useProfile.ts` | User profile management |
| `src/store/useAppStore.ts` | Global state (Zustand) |
| `src/services/supabase.ts` | Supabase client config |
| `TEST_DATA.sql` | Test data for routes |
| `E2E_TEST_GUIDE.md` | Full testing guide |

---

## 🔧 Troubleshooting

### ❌ "No routes showing"
- ✅ Run `TEST_DATA.sql` in Supabase
- ✅ Verify routes table has 3 rows
- ✅ Check conductor UUID matches

### ❌ "Login fails"
- ✅ Verify auth user created in Supabase Dashboard
- ✅ Check email/password correct
- ✅ Clear app cache: restart Expo

### ❌ "Seat selection screen blank"
- ✅ Make sure route was selected first
- ✅ Check console for errors (Expo DevTools)
- ✅ Verify selectedRoute in store (use Zustand DevTools browser ext)

### ❌ "Booking doesn't save"
- ✅ Check Supabase online (Dashboard > Project Status)
- ✅ Verify user ID in auth token (DevTools > Network > Supabase request)
- ✅ Check RLS policies allow INSERT for bookings table

---

## ✨ Feature Checklist

- [x] User registration with Supabase Auth
- [x] Email/password validation
- [x] Profile auto-creation on signup
- [x] Login with session persistence
- [x] Route search with real-time fetch
- [x] Search/filter by origin & destination
- [x] Filter by available seats only
- [x] Dynamic seat grid (1-5 seats)
- [x] Occupancy detection from bookings
- [x] Seat selection with visual feedback
- [x] Booking confirmation with calculation
- [x] Service fee (20%) auto-calculated
- [x] Booking saved to database
- [x] Trip status with occupancy view
- [x] Driver info display
- [x] User profile with stats
- [x] Role switching (passenger/driver)
- [x] Logout functionality
- [x] Error handling throughout
- [x] Loading states on async operations

---

## 🎯 Next Steps

After testing MVP:

1. **Create real routes** (via admin or driver registration)
2. **Test payment** (integrate Stripe/Mercado Pago)
3. **Add maps** (Google Maps for route preview)
4. **Setup notifications** (real-time trip updates)
5. **Deploy to TestFlight/Play Store**

---

## 📞 Commands Reference

```bash
# Start development
npm start

# Run on iOS
npm start
# Press: i

# Run on Android
npm start
# Press: a

# Run on Web (testing UI only)
npm start
# Press: w

# Check for errors
npm run lint

# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

---

## 🔐 Environment Variables

Create `.env` file in root (if needed):
```env
SUPABASE_URL=https://iksenkkaxlmdiyeezoym.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
```

Currently hardcoded in `src/services/supabase.ts` - update for production!

---

## 📊 Database Status

**Tables**: ✅ Created  
**RLS Policies**: ✅ Enabled  
**Test Data**: ✅ Ready (3 routes, 1 driver)  
**Users**: 🔧 Create in Dashboard

---

## 🎓 Learning Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)
- [Zustand Docs](https://github.com/pmndrs/zustand)

---

**Ready to test?** Follow Step 1-4 above and you're good! 🚀
