import { PROFILE_COLUMNS, getMyPhone, getMyCedula, saveMyProfile } from '../services/profileColumns'
import { useState, useEffect, useRef } from "react";
import { Alert, AppState, AppStateStatus } from "react-native";
import * as Sentry from "@sentry/react-native";
import { supabase } from "../services/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useAppStore, AppUser } from "../store/useAppStore";
import { registerUserSession, deactivateCurrentSession, clearLocalSessionKey, updateSessionPushToken } from "../services/userSessions";
import { checkDeviceVerification } from "../services/deviceVerification";
import { checkPendingProfileSetup } from "../services/profileCompleteness";
import { getPushNotificationToken, registerPushToken, sendPushNotificationToUser } from "../services/pushNotifications";
import { setUserId } from "../services/analytics";
import { withTimeout } from "../utils/withTimeout";

let _crashlytics: any = null
try { _crashlytics = require("@react-native-firebase/crashlytics").default } catch {}

export const toAppRole = (role: string | null): AppUser['role'] =>
  role === 'driver' || role === 'support' ? role : 'passenger'

export const toAppMembership = (type: string | null): NonNullable<AppUser['membership_type']> =>
  type === 'basic' || type === 'premium' || type === 'vip' ? type : 'free'

// Flag de módulo: evita mostrar el alert de sesión expirada cuando el logout es manual
let _manualLogout = false
// Evita mostrar el alert múltiples veces si hay varios listeners activos
let _sessionExpiredAlertPending = false

// useAuth() se llama desde ~17 pantallas distintas -- cada una monta su PROPIA copia de
// este hook. Antes esto era redundante pero inofensivo; con sesión única (punto 4 de
// seguridad) dejó de serlo: cada copia volvía a llamar registerUserSession() por su
// cuenta, y dos copias corriendo casi al mismo tiempo se pisaban entre sí (condición de
// carrera real, confirmada el 12-nov-2026 -- causaba un parpadeo infinito entre Inicio y
// "Confirma tu cédula"). Estas variables de módulo (no refs por instancia) se comparten
// entre TODAS las copias del hook, para que el registro de sesión y las suscripciones de
// Realtime corran una sola vez por sesión real, sin importar cuántos componentes monten
// useAuth() al mismo tiempo.
let _profileChannel: ReturnType<typeof supabase.channel> | null = null
let _sessionChannel: ReturnType<typeof supabase.channel> | null = null
let _sessionRegisteredForUserId: string | null = null

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setUser: setAppUser, setAuthUser, setDeviceVerificationStatus, setJustRecoveredAccount } = useAppStore();
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
        .select(PROFILE_COLUMNS)
        .eq("id", currentSession.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      if (profile) {
        const cedula = await getMyCedula()
        await checkDeviceVerification(cedula)
        setAppUser({
          id: profile.id,
          name: profile.name,
          email: profile.email ?? '',
          phone: (await getMyPhone()) ?? undefined,
          cedula,
          role: toAppRole(profile.role),
          rating: profile.rating ?? 0,
          avatar_url: profile.avatar_url ?? undefined,
          membership_type: toAppMembership(profile.membership_type),
          membership_expiry: profile.membership_expiry,
          balance: profile.balance ?? 0,
          is_admin: profile.is_admin ?? false,
        });
      } else {
        const userName = currentSession.user.user_metadata?.full_name || "Usuario";
        const userEmail = currentSession.user.email || `${currentSession.user.id}@trive.local`;
        const userPhone = currentSession.user.phone || currentSession.user.user_metadata?.phone || undefined;

        const { error: saveError } = await saveMyProfile(currentSession.user.id, {
          name: userName,
          email: userEmail,
          phone: userPhone,
          role: "passenger",
          rating: 0,
        });
        if (saveError) throw saveError;

        const { data: insertedProfile, error: insertError } = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("id", currentSession.user.id)
          .single();

        if (insertError) throw insertError;

        // Cuenta recién creada, todavía sin cédula -- nada que verificar aún.
        setDeviceVerificationStatus('recognized')

        setAppUser({
          id: insertedProfile.id,
          name: insertedProfile.name,
          email: insertedProfile.email ?? '',
          phone: userPhone ?? null,
          cedula: null,
          role: toAppRole(insertedProfile.role),
          rating: insertedProfile.rating ?? 0,
          avatar_url: insertedProfile.avatar_url ?? undefined,
        });
      }

      // Session is set AFTER the profile is ready — AppNavigator only transitions
      // to TabNavigator once both session and complete user data are available.
      // This eliminates the flash of wrong role/content during login.
      setSession(currentSession);

      subscribeToProfile(currentSession.user.id)

      // Todo lo de abajo (registrar la sesión, cerrar otras, pedir push token) solo debe
      // correr UNA VEZ por sesión real -- no una vez por cada componente que llame a
      // useAuth(). Sin este guard, dos copias del hook montadas al mismo tiempo corrían
      // registerUserSession() en paralelo y se revocaban la sesión la una a la otra.
      if (_sessionRegisteredForUserId !== currentSession.user.id) {
        _sessionRegisteredForUserId = currentSession.user.id

        const { sessionKey, revoked } = await registerUserSession(currentSession.user.id);
        setUserId(currentSession.user.id);
        try { if (_crashlytics) _crashlytics().setUserId(currentSession.user.id) } catch {}
        try { Sentry.setUser({ id: currentSession.user.id }) } catch {}

        subscribeToOwnSession(sessionKey)
        checkPendingProfileSetup(currentSession.user.id)

        // Sesión única (punto 4 de seguridad): avisar por push a los dispositivos que
        // quedaron fuera porque esta cuenta entró aquí. Si esa app sigue abierta y
        // conectada, subscribeToOwnSession ya la cierra al instante por su cuenta;
        // esto es el aviso para cuando no lo esté.
        revoked.forEach((r) => {
          if (r.push_token) {
            sendPushNotificationToUser(
              r.push_token,
              'Sesión cerrada',
              'Tu cuenta de Trive se abrió en otro dispositivo, así que cerramos esta sesión por seguridad.',
              { type: 'session_revoked' }
            ).catch(() => {})
          }
        })

        getPushNotificationToken(currentSession.user.id)
          .then((token) => {
            if (token) {
              registerPushToken(currentSession.user.id, token)
              updateSessionPushToken(token)
            }
          })
          .catch(() => {})
      }
    } catch (err: any) {
      console.error("Error restoring profile from session:", err);
      setAppUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isRefreshTokenError = (msg?: string) =>
      !!msg && (
        msg.includes('Refresh Token Not Found') ||
        msg.includes('Invalid Refresh Token') ||
        msg.includes('refresh_token_not_found') ||
        msg.includes('Token expired')
      )

    const initializeSession = async () => {
      try {
        // Con timeout: si esta llamada se queda colgada, el usuario no debe
        // quedarse atascado para siempre en la pantalla de carga inicial.
        const { data, error } = await withTimeout(supabase.auth.getSession(), 8000);
        if (error) {
          if (isRefreshTokenError(error.message)) {
            // Token inválido: limpiar sesión y redirigir al login sin alert
            _manualLogout = true
            try { await supabase.auth.signOut() } catch {}
            _manualLogout = false
            setLoading(false);
            return;
          }
          console.error('Error getting auth session:', error);
          setError('Error de red al restaurar la sesión');
          setLoading(false);
          return;
        }

        restoreSession(data.session);
      } catch (err: any) {
        if (isRefreshTokenError(err?.message)) {
          _manualLogout = true
          try { await supabase.auth.signOut() } catch {}
          _manualLogout = false
          setLoading(false);
          return;
        }
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
        // Limpiar suscripciones al cerrar sesión (compartidas entre todas las copias de
        // useAuth() -- esto es lo único que debe tirarlas, nunca el desmontaje de un
        // componente individual, o se rompería el hook de otra pantalla que siga montada).
        if (_profileChannel) {
          supabase.removeChannel(_profileChannel)
          _profileChannel = null
        }
        if (_sessionChannel) {
          supabase.removeChannel(_sessionChannel)
          _sessionChannel = null
        }
        _sessionRegisteredForUserId = null
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
      // Los canales de Realtime NO se limpian aquí a propósito: son compartidos entre
      // todas las copias de useAuth() montadas a la vez (ver comentario junto a
      // _profileChannel más arriba). Que esta pantalla en particular se desmonte no
      // significa que ya nadie los necesite -- solo el SIGNED_OUT real los cierra.
    };
  }, []);

  const subscribeToProfile = (userId: string) => {
    // Compartido entre todas las copias de useAuth() -- si ya hay un canal activo
    // (de esta instancia o de otra), no crear otro.
    if (_profileChannel) return

    const channel = supabase
      .channel(`profile-live:${userId}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        async (payload) => {
          const p = payload.new as any
          const cedula = await getMyCedula()
          await checkDeviceVerification(cedula)
          setAppUser({
            id: p.id,
            name: p.name,
            email: p.email,
            phone: (await getMyPhone()) ?? undefined,
            cedula,
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
    _profileChannel = channel
  }

  // Sesión única (punto 4 de seguridad): si otro dispositivo nos marca is_current=false
  // (porque esa cuenta entró en otro lado), cerramos sesión aquí al instante. El
  // SIGNED_OUT que dispara ya muestra el aviso de "sesión cerrada en otro dispositivo"
  // (más abajo en este archivo) -- no hace falta un alert aparte.
  const subscribeToOwnSession = (sessionKey: string) => {
    if (_sessionChannel) return

    const channel = supabase
      .channel(`own-session:${sessionKey}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_sessions', filter: `session_key=eq.${sessionKey}` },
        async (payload) => {
          const row = payload.new as any
          if (row.is_current === false) {
            try { await supabase.auth.signOut() } catch {}
          }
        }
      )
      .subscribe()
    _sessionChannel = channel
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
    referredBy?: string
  ) => {
    try {
      setError(null);
      setLoading(true);

      // El teléfono no se recibe aquí: se verifica por OTP después (VerifyPhone).
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
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
          role: 'passenger',
        }
        if (referredBy?.trim()) {
          profileData.referred_by = referredBy.trim().toUpperCase()
        }
        const { error: profileSaveError } = await saveMyProfile(profileData.id as string, profileData)
        if (profileSaveError) console.warn('Profile save skipped (trigger handled it):', profileSaveError)
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
      try { Sentry.setUser(null) } catch {}
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Limpiar el estado después del logout exitoso
      setSession(null);
      setUser(null);
      setAuthUser(null);
      setAppUser(null);
      setDeviceVerificationStatus('unknown');
      setJustRecoveredAccount(false);
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
    isAuthenticated: !!session,
  };
};
