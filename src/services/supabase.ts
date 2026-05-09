import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const supabaseUrl = "https://iksenkkaxlmdiyeezoym.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrc2Vua2theGxtZGl5ZWV6b3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzA3NDksImV4cCI6MjA5MDg0Njc0OX0.ZNxwFnhTQOWKiLrdtTWsJDNLXRmc9T3tDtmE87HxrVA";

// Supabase auth tokens stored in encrypted hardware-backed storage
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
