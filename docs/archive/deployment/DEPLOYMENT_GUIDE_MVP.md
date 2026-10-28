# 🚀 DEPLOY MVP - TRIVE AVAILABLE RIDES

**Status**: Ready to Deploy  
**Time to Market**: 2 hours from now  
**Risk Level**: LOW (additive only, no breaking changes)

---

## ✅ WHAT'S DONE

### Phase 1: Database ✓ (SQL - 15 min)
- [x] `AVAILABLE_RIDES_VIEW.sql` - Filters routes with available seats, shows in real-time
- [x] Uses existing database schema (ZERO migrations needed)
- [x] Realtime capable via Supabase

### Phase 2: Frontend - Hook ✓ (TypeScript - 30 min)
- [x] `src/hooks/useAvailableRides.ts` - Fetches + subscribes to realtime updates
- [x] Auto-refetch when occupancy changes
- [x] Error handling + loading states

### Phase 3: Frontend - Screen ✓ (React Native - 1h)
- [x] `src/screens/AvailableRidesScreen.tsx` - Professional UI
- [x] Shows: Origin → Destination | Time | Seats [2/4] | Price | Driver Rating
- [x] Pull-to-refresh
- [x] Realtime live updates
- [x] "Reservar" button → SeatSelectionScreen (existing flow)
- [x] Zero styling conflicts (uses COLORS theme)

### Phase 4: Navigation ✓ (Routing - 15 min)
- [x] Added to `AppNavigator.tsx`
- [x] "Viajes Ahora" button on HomeScreen (CTA)
- [x] Integrated into existing tab navigation

---

## 🎯 INSTRUCTIONS - DEPLOY NOW

### STEP 1: Execute SQL in Supabase (5 minutes)

```bash
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to: SQL Editor
4. Click: "+ New Query"
5. Copy entire contents of: AVAILABLE_RIDES_VIEW.sql
6. Paste in SQL Editor
7. Click: ▶ RUN
8. Result: "CREATE VIEW" (no errors)
9. Verify: SELECT * FROM available_rides LIMIT 1;
   - Should return routes with available seats
```

**Expected Output**:
```json
{
  "id": "uuid...",
  "origin": "Cali",
  "destination": "Puerto Tejada",
  "seats_available_count": 2,
  "driver_name": "Juan",
  "driver_rating": 4.9,
  ...
}
```

---

### STEP 2: Test on Device/Emulator (10 minutes)

```bash
# Terminal 1 - Start dev server
npm start

# Terminal 2 - Run on Android (or use Expo Go)
expo run:android
# OR
expo run:ios
```

**User Flow to Test**:
1. ✅ Login with test account
2. ✅ HomeScreen → See "Viajes Ahora" button (green gradient)
3. ✅ Tap "Viajes Ahora"
4. ✅ See list of available routes
5. ✅ Each card shows: Origin → Destination, Time, Seats [X/Y], Price per seat, Driver rating
6. ✅ Pull down to refresh (manual refetch)
7. ✅ Tap "Reservar" → Goes to SeatSelectionScreen
8. ✅ Select seats → BookingScreen
9. ✅ Complete booking → Success

---

### STEP 3: Realtime Test (5 minutes)

**Open 2 browser tabs** in Supabase SQL Editor:

**Tab 1** - Monitor changes:
```sql
SELECT * FROM available_rides 
WHERE origin LIKE '%Cali%' 
ORDER BY departure_time ASC 
LIMIT 10;
```

**Tab 2** - Simulate booking (occupy a seat):
```sql
-- This simulates a customer booking a seat
INSERT INTO bookings (route_id, passenger_id, seat_number, booking_status, price)
VALUES ('YOUR_ROUTE_ID', 'YOUR_USER_ID', 1, 'confirmed', 15000);
```

**Expected**: 
- Available rides count decreases in real-time
- When `seats_available_count` hits 0, ride disappears from list
- Same update happens in app (Realtime subscription works)

---

### STEP 4: Deploy to Production (15 minutes)

```bash
# Create a release build
expo build:android --release-channel production
# OR
eas build --platform android --profile production

# Wait for APK to build (~20 min in background)
# Then deploy to Play Store / TestFlight
```

---

## 🧪 QUALITY CHECKLIST

### Database
- [ ] VIEW created successfully in Supabase
- [ ] SELECT from `available_rides` returns data
- [ ] Only routes with `status='scheduled'` appear
- [ ] Only routes with `departure_time > NOW()` appear
- [ ] Only routes with `available_seats > 0` appear

### App - UX/UI
- [ ] HomeScreen has "Viajes Ahora" button (green, top CTA)
- [ ] Button is clickable
- [ ] Navigates to AvailableRidesScreen
- [ ] Screen title: "Viajes Disponibles"
- [ ] Back button works

### App - Functionality
- [ ] List shows routes (if any exist in DB)
- [ ] Empty state: "No hay viajes disponibles" (if none)
- [ ] Pull-to-refresh works
- [ ] Each card shows:
  - [ ] Origin (green dot)
  - [ ] Destination (red dot)
  - [ ] Departure time
  - [ ] "en X min" countdown
  - [ ] [2/4] seats available
  - [ ] $ Price per seat
  - [ ] Driver name + rating + comment count
  - [ ] Green "Reservar" button
  - [ ] Vehicle plate + color

### App - Booking Flow
- [ ] Tap "Reservar" → SeatSelectionScreen
- [ ] Select seat
- [ ] Tap "Continuar" → BookingScreen
- [ ] Confirm booking
- [ ] Success notification

### App - Realtime
- [ ] Open app on 2 devices
- [ ] Device A: Book a seat
- [ ] Device B: Should see seats count decrease immediately
- [ ] When last seat taken: Ride disappears

### App - Edge Cases
- [ ] No auth: Tap "Reservar" → "Inicia sesión" alert
- [ ] Network error: Shows "Error cargando viajes" + Retry button
- [ ] Empty list: Shows "No hay viajes disponibles" + helpful text
- [ ] Stale data: Pull refresh → updates

---

## 📊 METRICS TO TRACK POST-LAUNCH

1. **User Adoption**
   - % users clicking "Viajes Ahora"
   - Avg session time in AvailableRidesScreen
   - Bounce rate (users who go back without booking)

2. **Conversions**
   - Started booking from AvailableRides → % completed
   - Avg time to book
   - Peak hours for ride availability

3. **System Health**
   - Realtime latency (ms to see seat update)
   - View query performance (should be <100ms)
   - Crash rate on this screen
   - Error rate

4. **Business**
   - Rides per hour on platform
   - Occupancy rate (avg seats filled per ride)
   - Revenue per ride
   - Repeat passenger rate

---

## 🔧 TROUBLESHOOTING

### Problem: "No hay viajes disponibles" but DB has routes
**Solution**: 
```sql
-- Check if routes meet criteria
SELECT id, status, departure_time, 
  (total_seats - COALESCE(COUNT(b.id), 0)) as available
FROM routes r
LEFT JOIN bookings b ON r.id = b.route_id 
  AND b.booking_status != 'cancelled'
GROUP BY r.id
LIMIT 10;

-- Should show: status='scheduled' AND departure_time > NOW() AND available > 0
```

### Problem: Realtime not updating
**Check**:
1. Is Supabase URL/key correct in `.env`?
2. Run: `SELECT * FROM realtime.messages LIMIT 1;` (should not error)
3. Check network tab - should see WebSocket connection to `wss://api...`

### Problem: "Reservar" button doesn't navigate
**Check**:
1. Is user logged in? (If not, should show alert)
2. Is `selectedRoute` being set in store? (Debug: log in console)
3. Does SeatSelectionScreen exist? (Should - not new)

### Problem: App crashes on AvailableRidesScreen
**Debug**:
```typescript
// Add to useAvailableRides hook:
useEffect(() => {
  console.log('Rides loaded:', rides.length)
  console.log('Loading:', loading)
  console.log('Error:', error)
}, [rides, loading, error])
```

---

## 📝 ROLLBACK PLAN (If needed)

If major issue found post-launch:

```bash
# Revert to previous version
git revert <commit-hash-of-AvailableRides>
expo build:android --release-channel production
# Push to stores
```

**Safe because**:
- No database changes (VIEW is additive)
- No breaking changes to existing code
- AvailableRides is a new route (can be disabled in AppNavigator)

---

## 🎉 SUCCESS INDICATORS

✅ **MVP is successful when**:
1. No critical errors after 4 hours of live testing
2. Realtime updates work (seat count changes live)
3. Booking flow complete: AvailableRides → SeatSelection → Booking → Success
4. Performance: Screen loads in < 2 seconds
5. UX: Users can book a ride in < 30 seconds total

---

## 📞 SUPPORT

**Post-launch Support**:
- Monitor Sentry/Crashlytics for errors
- Check Supabase logs for slow queries
- Track user feedback in form
- Day 1: Expect 50-100 bookings (test beta users)
- Day 1 Goal: 0 critical issues

---

**Deployment Time**: NOW  
**Expected Live**: 2 hours from SQL execution  
**Team**: Full stack (no coordination needed - isolated changes)

Let's ship! 🚀
