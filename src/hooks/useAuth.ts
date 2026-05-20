import { useState, useEffect, useRef } from "react";
import { Alert, AppState, AppStateStatus } from "react-native";
import { supabase } from "../services/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useAppStore } from "../store/useAppStore";
import { registerUserSession, deactivateCurrentSession, clearLocalSessionKey } from "../services/userSessions";
import { getPushNotificationToken, registerPushToken } from "../services/pushNotifications";
import { setUserId } from "../services/analytics";

let _crashlytics: any = null
try { _crashlytics = require("@react-native-firebase/crashlytics").default } catch {}

// Flag de módulo: evita mostrar el alert de sesión expirada cuando el logout es manual
let _manualLogout = false
// Evita mostrar el alert múltiples veces si hay varios listeners activos
let _sessionExpiredAlertPending = false

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setUser: setAppUser, setAuthUser } = useAppStore();
  const profileChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const currentSessionRef = useRef<Session | null>(null)

  const restoreSession = async (currentSession: Session | null) => {
    currentSessionRef.current = currentSession
    setAuthUser(currentSession?.user ?? null);
    setUser(currentSession?.user ?? null);

    if (!currentSession?.user) {
      setAppUser(null);
      setSession(null);
      setLoading(false);
      return;
    }

    // Show LoadingScreen while profile loads when it's a new/different user.
    // Token refreshes (same user ID) skip this to avoid an unnecessary loading flash.
    const prevUserId = useAppStore.getState().user?.id
    if (!prevUserId || prevUserId !== currentSession.user.id) {
      setLoading(true)
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentSession.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      if (profile) {
        setAppUser({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          role: profile.role,
          rating: profile.rating,
          avatar_url: profile.avatar_url,
          membership_type: profile.membership_type || 'free',
          membership_expiry: profile.membership_expiry,
          balance: profile.balance ?? 0,
          is_admin: profile.is_admin ?? false,
        });
      } else {
        const userName = currentSession.user.user_metadata?.full_name || "Usuario";
        const userEmail = currentSession.user.email || `${currentSession.user.id}@trive.local`;
        const userPhone = currentSession.user.phone || currentSession.user.user_metadata?.phone || undefined;

        const { data: insertedProfile, error: insertError } = await supabase
          .from("profiles")
          .upsert([
            {
              id: currentSession.user.id,
              name: userName,
              email: userEmail,
              phone: userPhone,
              role: "passenger",
              rating: 0,
            },
          ], { onConflict: 'id' })
          .select()
          .single();

        if (insertError) throw insertError;

        setAppUser({
          id: insertedProfile.id,
          name: insertedProfile.name,
          email: insertedProfile.email,
          phone: insertedProfile.phone,
          role: insertedProfile.role,
          rating: insertedProfile.rating,
          avatar_url: insertedProfile.avatar_url,
        });
      }

      // Session is set AFTER the profile is ready — AppNavigator only transitions
      // to TabNavigator once both session and complete user data are available.
      // This eliminates the flash of wrong role/content during login.
      setSession(currentSession);

      await registerUserSession(currentSession.user.id);
      setUserId(currentSession.user.id);
      try { if (_crashlytics) _crashlytics().setUserId(currentSession.user.id) } catch {}

      subscribeToProfile(currentSession.user.id)

      getPushNotificationToken()
        .then((token) => {
          if (token) registerPushToken(currentSession.user.id, token)
        })
        .catch(() => {})
    } catch (err: any) {
      console.error("Error restoring profile from session:", err);
      setAppUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting auth session:', error);
          setError('Error de red al restaurar la sesión');
          setLoading(false);
          return;
        }

        restoreSession(data.session);
      } catch (err: any) {
        console.error('Error getting auth session:', err);
        setError('Error de red al restaurar la sesión');
        setLoading(false);
      }
    };

    initializeSession();

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' && !_manualLogout && !_sessionExpiredAlertPending) {
        _sessionExpiredAlertPending = true
        Alert.alert(
          'Sesión expirada',
          'Tu sesión expiró o fue cerrada en otro dispositivo. Por favor inicia sesión de nuevo.',
          [{ text: 'OK', onPress: () => { _sessionExpiredAlertPending = false } }]
        )
      }
      if (event === 'SIGNED_OUT') {
        // Defer reset so all concurrent callbacks see _manualLogout = true
        setTimeout(() => { _manualLogout = false }, 0)
        // Limpiar suscripción de perfil al cerrar sesión
        if (profileChannelRef.current) {
          supabase.removeChannel(profileChannelRef.current)
          profileChannelRef.current = null
        }
      }
      if (event === 'SIGNED_IN' && session?.user) {
        subscribeToProfile(session.user.id)
      }
      restoreSession(session);
    });

    // Realtime: recarga perfil cuando la app vuelve del background
    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active' && currentSessionRef.current?.user) {
        restoreSession(currentSessionRef.current)
      }
    }
    const appStateSub = AppState.addEventListener('change', handleAppState)

    return () => {
      data?.subscription?.unsubscribe();
      appStateSub.remove()
      if (profileChannelRef.current) {
        supabase.removeChannel(profileChannelRef.current)
        profileChannelRef.current = null
      }
    };
  }, []);

  const subscribeToProfile = (userId: string) => {
    // Si ya hay un canal activo para este usuario, no crear otro
    if (profileChannelRef.current) return

    const channel = supabase
      .channel(`profile-live:${userId}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const p = payload.new as any
          setAppUser({
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            role: p.role,
            rating: p.rating,
            avatar_url: p.avatar_url,
            membership_type: p.membership_type || 'free',
            membership_expiry: p.membership_expiry,
            balance: p.balance ?? 0,
            is_admin: p.is_admin ?? false,
          })
        }
      )
      .subscribe()
    profileChannelRef.current = channel
  }

  const signInWithOTP = async (phone: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Supabase expects phone numbers in international format
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      const message = err.message || "Error enviando OTP";
      setError(message);
      console.error('OTP sign-in error:', message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (phone: string, token: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Supabase expects phone numbers in international format
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token,
        type: 'sms',
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      const message = err.message || "Código OTP inválido";
      setError(message);
      console.error('OTP verification error:', message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      const message = err.message || "Error logging in";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithApple = async () => {
    throw new Error('Apple Sign-In no está disponible');
  }

  const handleGoogleLogin = async () => {
    throw new Error('Google Sign-In no está disponible');
  }

  const sendEmailVerification = async (email: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Supabase envía automáticamente email de confirmación
      // Este método fuerza el reenvío
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      const message = err.message || "Error enviando email de verificación";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmEmail = async (email: string, token: string) => {
    try {
      setError(null);
      setLoading(true);

      // Verificar el token confirmado
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      const message = err.message || "Código de verificación inválido";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    referredBy?: string
  ) => {
    try {
      setError(null);
      setLoading(true);

      // Create auth user - Supabase automáticamente envía email de verificación
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone,
          },
        },
      });

      if (authError) throw authError;

      // Create profile — if this fails due to RLS (email not yet confirmed),
      // the DB trigger handle_new_user() already created it server-side.
      if (authData.user) {
        const profileData: Record<string, any> = {
          id: authData.user.id,
          name,
          email,
          phone,
          role: 'passenger',
        }
        if (referredBy?.trim()) {
          profileData.referred_by = referredBy.trim().toUpperCase()
        }
        await supabase
          .from('profiles')
          .upsert([profileData], { onConflict: 'id' })
          .then(({ error }) => {
            if (error) console.warn('Profile upsert skipped (trigger handled it):', error.message)
          })
      }

      return authData;
    } catch (err: any) {
      const message = err.message || "Error registering";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      setLoading(true);
      _manualLogout = true
      await deactivateCurrentSession();
      await clearLocalSessionKey();
      setUserId(null);
      try { if (_crashlytics) _crashlytics().setUserId('') } catch {}
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Limpiar el estado después del logout exitoso
      setSession(null);
      setUser(null);
      setAuthUser(null);
      setAppUser(null);
    } catch (err: any) {
      const message = err.message || "Error logging out";
      setError(message);
      console.error('Logout error:', message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    error,
    login,
    register,
    logout,
    signInWithOTP,
    verifyOTP,
    sendEmailVerification,
    confirmEmail,
    signInWithApple,
    handleGoogleLogin,
    isAuthenticated: !!session,
  };
};
