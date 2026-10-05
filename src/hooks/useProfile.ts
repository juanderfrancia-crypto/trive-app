import { PROFILE_COLUMNS, getMyPhone } from '../services/profileColumns'
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { toAppRole } from "./useAuth";
import type { Tables } from "../types/database.types";

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

type ProfileRow = Omit<Tables<"profiles">, "phone">;

const toProfile = (row: ProfileRow): Profile => ({
  ...row,
  email: row.email ?? "",
  avatar_url: row.avatar_url ?? undefined,
  vehicle_photo_url: row.vehicle_photo_url ?? undefined,
  role: toAppRole(row.role),
  rating: row.rating ?? 0,
  total_trips: row.total_trips ?? 0,
  total_spent: row.total_spent ?? 0,
  is_driver_verified: row.is_driver_verified ?? false,
  created_at: row.created_at ?? "",
  updated_at: row.updated_at ?? "",
});

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
          .select(PROFILE_COLUMNS)
          .eq("id", userId)
          .maybeSingle();

        if (!isActive) return;

        if (fetchError && fetchError.code !== 'PGRST116') {
          setError(fetchError.message);
        } else {
          setProfile(data ? toProfile(data) : null);
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
        .select(PROFILE_COLUMNS)
        .eq("id", id)
        .maybeSingle();

      const profile = data ? toProfile(data) : null;
      if (fetchError && fetchError.code !== 'PGRST116') {
        setProfile(null);
      } else {
        setProfile(profile);
      }
      return profile;
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
        .select(PROFILE_COLUMNS)
        .maybeSingle();

      if (updateError) throw updateError;

      if (data) {
        const profile = toProfile(data);
        setProfile(profile);
        return profile;
      } else {
        const { data: updatedProfile, error: refetchError } = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("id", updates.id)
          .single();

        if (refetchError) throw refetchError;
        const profile = toProfile(updatedProfile);
        setProfile(profile);
        return profile;
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
        .select(PROFILE_COLUMNS)
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

        const profile = toProfile(newProfile);
        setProfile(profile);
        setLoading(false);
        return profile;
      }

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select(PROFILE_COLUMNS)
        .maybeSingle();

      if (updateError) throw updateError;

      let updatedProfile = data;
      if (!updatedProfile) {
        const { data: refetched, error: refetchError } = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("id", userId)
          .single();

        if (refetchError) throw refetchError;
        updatedProfile = refetched;
      }

      const profile = toProfile(updatedProfile);
      setProfile(profile);
      setLoading(false);
      return profile;
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
