import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useAppStore } from "../store/useAppStore";
import { registerUserSession, deactivateCurrentSession, clearLocalSessionKey } from "../services/userSessions";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setUser: setAppUser, setAuthUser } = useAppStore();

  const restoreSession = async (currentSession: Session | null) => {
    setSession(currentSession);
    setAuthUser(currentSession?.user ?? null);
    setUser(currentSession?.user ?? null);

    if (!currentSession?.user) {
      setAppUser(null);
      setLoading(false);
      return;
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

        if (insertError) {
          throw insertError;
        }

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

      await registerUserSession(currentSession.user.id);
    } catch (err: any) {
      console.error("Error restoring profile from session:", err);
      setAppUser(null);
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

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      restoreSession(session);
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

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
    phone: string
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

      // Create profile
      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert([
            {
              id: authData.user.id,
              name,
              email,
              phone,
              role: "passenger",
            },
          ], { onConflict: 'id' });

        if (profileError) throw profileError;
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
      await deactivateCurrentSession();
      await clearLocalSessionKey();
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
