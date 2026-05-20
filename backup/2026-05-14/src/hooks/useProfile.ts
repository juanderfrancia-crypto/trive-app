import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  vehicle_photo_url?: string;
  role: "passenger" | "driver" | "support";
  rating: number;
  total_trips: number;
  total_spent: number;
  is_driver_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Efecto solo para cargar el perfil inicial
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let isActive = true;

    const doFetch = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (!isActive) return;

        if (fetchError && fetchError.code !== 'PGRST116') {
          setError(fetchError.message);
        } else {
          setProfile(data);
        }
      } catch (err: any) {
        if (!isActive) return;
        setError(err.message);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    doFetch();

    return () => {
      isActive = false;
    };
  }, [userId]);

  const fetchProfile = useCallback(async (id: string) => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        setProfile(null);
      } else {
        setProfile(data);
      }
      return data;
    } catch (err: any) {
      setError(err.message);
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      setError(null);
      setLoading(true);

      if (!updates.id) {
        throw new Error("ID de usuario es requerido para actualizar el perfil");
      }

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updates.id)
        .select()
        .maybeSingle();

      if (updateError) throw updateError;

      if (data) {
        setProfile(data);
        return data;
      } else {
        const { data: updatedProfile, error: refetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", updates.id)
          .single();

        if (refetchError) throw refetchError;
        setProfile(updatedProfile);
        return updatedProfile;
      }
    } catch (err: any) {
      const message = err.message || "Error updating profile";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (userId: string, newRole: "passenger" | "driver") => {
    try {
      setError(null);
      setLoading(true);

      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (!existingProfile) {
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            name: "Usuario",
            email: `user-${userId.substring(0, 8)}@trive.local`,
            role: newRole,
          })
          .select()
          .single();

        if (createError) throw new Error("No se pudo crear el perfil.");

        setProfile(newProfile);
        setLoading(false);
        return newProfile;
      }

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select()
        .maybeSingle();

      if (updateError) throw updateError;

      let updatedProfile = data;
      if (!updatedProfile) {
        const { data: refetched, error: refetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (refetchError) throw refetchError;
        updatedProfile = refetched;
      }

      setProfile(updatedProfile);
      setLoading(false);
      return updatedProfile;
    } catch (err: any) {
      setError(err.message || "Error al cambiar el rol");
      setLoading(false);
      throw err;
    }
  };

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    switchRole,
  };
};
