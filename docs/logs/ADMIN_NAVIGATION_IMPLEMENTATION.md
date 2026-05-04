# Admin Navigation Implementation - Testing Guide

## What Was Implemented

### 1. Store Updates (`useAppStore.ts`)
- Added `is_admin?: boolean` field to `AppUser` interface
- Now tracks whether user has admin privileges

### 2. Authentication Updates (`LoginPhoneScreen.tsx`)
- Updated all `setUser()` calls to include `is_admin` field
- Loads `is_admin` value from Supabase profiles table:
  - **Email login** (line ~103): Includes `is_admin: profile.is_admin || false`
  - **OTP login - existing profile** (line ~153): Includes `is_admin: profile.is_admin || false`
  - **OTP login - new profile** (line ~182): Includes `is_admin: false` for new users

### 3. Drawer Navigation (`DrawerNavigator.tsx` - NEW FILE)
- Created custom drawer navigator with:
  - **Header section**: Shows user avatar, name, and email
  - **Main menu items**: Inicio (Home), Mi Perfil (Profile)
  - **Admin section**: Only visible if `user.is_admin === true`
    - Contains: "Verificar Documentos" option
  - Custom styling matching TRIVE theme
  - Proper icon usage from Expo Vector Icons

### 4. Navigation Updates (`AppNavigator.tsx`)
- Changed from `TabNavigator` directly to `DrawerNavigator`
- This wraps the entire tab-based UI with the drawer menu
- Maintains all existing modal screens in the Stack

## Testing Procedure

### Test Case 1: Regular User (No Admin)
1. Login with any regular user (passenger)
2. Check drawer menu - should show:
   - Header with user info
   - "Inicio"
   - "Mi Perfil"
   - NO "ADMINISTRACIÓN" section
   - NO "Verificar Documentos" option

### Test Case 2: Admin User
1. Login with `admin@trive.test` / `admin123456`
2. Check drawer menu - should show:
   - Header with user info
   - "Inicio"
   - "Mi Perfil"
   - **"ADMINISTRACIÓN" section header**
   - **"Verificar Documentos" option**
3. Click "Verificar Documentos"
   - Should navigate to AdminDocumentsScreen
   - Should show list of pending documents for verification
   - Should allow approve/reject with reasons

### Test Case 3: Profile Switching
1. Login as admin
2. Open drawer - see admin section
3. Logout
4. Login as regular user
5. Open drawer - no admin section

## Database Requirement

Make sure you've executed `ADMIN_DOCUMENTS_SETUP.sql` to:
- Add `is_admin` column to profiles table
- Create admin_actions audit table
- Set RLS policies for admin access

### Quick SQL to enable admin manually:
```sql
UPDATE profiles 
SET is_admin = true 
WHERE email = 'admin@trive.test';
```

## Expected Behavior

**Flow when is_admin = true:**
- User logs in → is_admin field loaded from DB → Drawer shows admin section → Can navigate to AdminDocuments → Can see/approve/reject pending documents

**Flow when is_admin = false:**
- User logs in → is_admin field loaded from DB (false) → Drawer only shows regular menu → Cannot see admin section

## Files Modified
- `src/store/useAppStore.ts` - Added is_admin to AppUser interface
- `src/screens/LoginPhoneScreen.tsx` - Load is_admin from DB on login
- `src/navigation/AppNavigator.tsx` - Use DrawerNavigator instead of TabNavigator
- `src/navigation/DrawerNavigator.tsx` - New file with drawer implementation

## Dependencies Added
- `@react-navigation/drawer` - Drawer navigator component

## Notes
- Drawer is customized with conditional rendering based on is_admin
- Icons use Expo Vector Icons (Ionicons)
- Styling respects TRIVE theme colors and typography
- AdminDocumentsScreen is already implemented from previous work
