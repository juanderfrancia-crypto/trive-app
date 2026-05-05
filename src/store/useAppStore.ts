import { create } from 'zustand'
import { persist, PersistStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
  balance: number
  selectedSeat: number | null
  selectedRoute: any | null
  bookingData: any | null
  hasSeenOnboarding: boolean
  notificationUnreadCount: number
  // Estado de verificación de email en progreso
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
  setNotificationUnreadCount: (notificationUnreadCount: number) => void
  setPendingVerification: (email: string, name: string, phone: string) => void
  clearPendingVerification: () => void
  logout: () => void
}

// Almacenamiento con fallback seguro
const createAsyncStorage = (): PersistStorage<AppState> => ({
  getItem: async (name) => {
    try {
      const item = await AsyncStorage.getItem(name)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.warn('Error leyendo AsyncStorage:', error)
      return null
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, JSON.stringify(value))
    } catch (error) {
      console.warn('Error escribiendo AsyncStorage:', error)
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name)
    } catch (error) {
      console.warn('Error removiendo AsyncStorage:', error)
    }
  },
})

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      authUser: null,
      isAuthenticated: false,
      isLoading: false,
      balance: 45800,
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
        set({
          pendingVerificationEmail: email,
          pendingVerificationName: name,
          pendingVerificationPhone: phone,
        })
      },
      clearPendingVerification: () => {
        set({
          pendingVerificationEmail: undefined,
          pendingVerificationName: undefined,
          pendingVerificationPhone: undefined,
        })
      },
      logout: () => {
        set({
          user: null,
          authUser: null,
          isAuthenticated: false,
          balance: 45800,
          selectedSeat: null,
          selectedRoute: null,
          bookingData: null,
          notificationUnreadCount: 0,
          pendingVerificationEmail: undefined,
          pendingVerificationName: undefined,
          pendingVerificationPhone: undefined,
          hasSeenOnboarding: true, // Mantener onboarding completado
        })
      },
    }),
    {
      name: 'trive-app-store',
      storage: createAsyncStorage() as any,
      partialize: (state): Partial<AppState> => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
        pendingVerificationEmail: state.pendingVerificationEmail,
        pendingVerificationName: state.pendingVerificationName,
        pendingVerificationPhone: state.pendingVerificationPhone,
        balance: state.balance,
      }),
    }
  )
)
