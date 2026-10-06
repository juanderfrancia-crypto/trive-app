import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import type { Database } from "../types/database.types";

const supabaseUrl = "https://iksenkkaxlmdiyeezoym.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrc2Vua2theGxtZGl5ZWV6b3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzA3NDksImV4cCI6MjA5MDg0Njc0OX0.ZNxwFnhTQOWKiLrdtTWsJDNLXRmc9T3tDtmE87HxrVA";

// SecureStore limita cada valor a 2048 bytes: la sesión se parte en trozos.
const SECURE_CHUNK_SIZE = 1800;

const SecureStoreAdapter = {
  getItem: async (key: string) => {
    const count = await SecureStore.getItemAsync(`${key}__count`);
    if (!count) return SecureStore.getItemAsync(key);
    const chunks: string[] = [];
    for (let i = 0; i < Number(count); i++) {
      const chunk = await SecureStore.getItemAsync(`${key}__${i}`);
      if (chunk === null) return null;
      chunks.push(chunk);
    }
    return chunks.join("");
  },
  setItem: async (key: string, value: string) => {
    const chunks = value.match(new RegExp(`.{1,${SECURE_CHUNK_SIZE}}`, "gs")) ?? [];
    await SecureStore.setItemAsync(`${key}__count`, String(chunks.length));
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}__${i}`, chunks[i]);
    }
  },
  removeItem: async (key: string) => {
    const count = await SecureStore.getItemAsync(`${key}__count`);
    for (let i = 0; i < Number(count ?? 0); i++) {
      await SecureStore.deleteItemAsync(`${key}__${i}`);
    }
    await SecureStore.deleteItemAsync(`${key}__count`);
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
