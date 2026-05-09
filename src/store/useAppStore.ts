import { create } from 'zustand'
import { persist, PersistStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { User } from '@supabase/supabase-js'

export interface AppUser {
  id: string
  name: string
  email: string
  phone?: string
  role: 'passenger' | 'driver' | 'support'
  rating: number
  avatar_url?: string
  is_admin?: boolean
  spent?: number
  earnings?: number
  balance?: number
  membership_type?: 'free' | 'basic' | 'premium' | 'vip'
  membership_expiry?: string | null
}

interface AppState {
  user: AppUser | null
  authUser: User | null
  isAuthenticated: boolean
  isLoading: boolean
  // balance se obtiene siempre del servidor, nunca se persiste localmente
  balance: number
  selectedSeat: number | null
  selectedRoute: any | null
  bookingData: any | null
  hasSeenOnboarding: boolean
  notificationUnreadCount: number
  pendingVerificationEmail?: string
  pendingVerificationName?: string
  pendingVerificationPhone?: string

  setUser: (user: AppUser | null) => void
  setAuthUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setBalance: (balance: number) => void
  setSelectedSeat: (seat: number | null) => void
  setSelectedRoute: (route: any | null) => void
  setBookingData: (data: any | null) => void
  setHasSeenOnboarding: (seen: boolean) => void
  setNotificationUnreadCount: (count: number) => void
  setPendingVerification: (email: string, name: string, phone: string) => void
  clearPendingVerification: () => void
  logout: () => void
}

// Solo persiste hasSeenOnboarding (no sensible) en AsyncStorage
const createAsyncStorage = (): PersistStorage<AppState> => ({
  getItem: async (name) => {
    try {
      const item = await AsyncStorage.getItem(name)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, JSON.stringify(value))
    } catch { /* silent */ }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name)
    } catch { /* silent */ }
  },
})

// Claves SecureStore para datos de verificación pendiente
const SECURE_PENDING_KEY = 'trive_pending_verification'

export const savePendingVerificationSecure = async (email: string, name: string, phone: string) => {
  await SecureStore.setItemAsync(SECURE_PENDING_KEY, JSON.stringify({ email, name, phone }))
}

export const loadPendingVerificationSecure = async () => {
  try {
    const raw = await SecureStore.getItemAsync(SECURE_PENDING_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const clearPendingVerificationSecure = async () => {
  try { await SecureStore.deleteItemAsync(SECURE_PENDING_KEY) } catch { /* silent */ }
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      authUser: null,
      isAuthenticated: false,
      isLoading: false,
      balance: 0, // siempre se actualiza desde el servidor, nunca persiste
      selectedSeat: null,
      selectedRoute: null,
      bookingData: null,
      hasSeenOnboarding: false,
      notificationUnreadCount: 0,
      pendingVerificationEmail: undefined,
      pendingVerificationName: undefined,
      pendingVerificationPhone: undefined,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAuthUser: (authUser) => set({ authUser }),
      setLoading: (isLoading) => set({ isLoading }),
      setBalance: (balance) => set({ balance }),
      setSelectedSeat: (selectedSeat) => set({ selectedSeat }),
      setSelectedRoute: (selectedRoute) => set({ selectedRoute }),
      setBookingData: (bookingData) => set({ bookingData }),
      setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
      setNotificationUnreadCount: (notificationUnreadCount) => set({ notificationUnreadCount }),
      setPendingVerification: (email: string, name: string, phone: string) => {
        // Guardar en SecureStore cifrado, no en AsyncStorage
        savePendingVerificationSecure(email, name, phone)
        set({
          pendingVerificationEmail: email,
          pendingVerificationName: name,
          pendingVerificationPhone: phone,
        })
      },
      clearPendingVerification: () => {
        clearPendingVerificationSecure()
        set({
          pendingVerificationEmail: undefined,
          pendingVerificationName: undefined,
          pendingVerificationPhone: undefined,
        })
      },
      logout: () => {
        clearPendingVerificationSecure()
        set({
          user: null,
          authUser: null,
          isAuthenticated: false,
          balance: 0,
          selectedSeat: null,
          selectedRoute: null,
          bookingData: null,
          notificationUnreadCount: 0,
          pendingVerificationEmail: undefined,
          pendingVerificationName: undefined,
          pendingVerificationPhone: undefined,
          hasSeenOnboarding: true,
        })
      },
    }),
    {
      name: 'trive-app-store',
      storage: createAsyncStorage() as any,
      // Solo persiste hasSeenOnboarding — nada sensible en AsyncStorage
      partialize: (state): Partial<AppState> => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
      }),
    }
  )
)
