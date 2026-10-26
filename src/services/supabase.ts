import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import type { Database } from "../types/database.types";

const supabaseUrl = "https://iksenkkaxlmdiyeezoym.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrc2Vua2theGxtZGl5ZWV6b3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzA3NDksImV4cCI6MjA5MDg0Njc0OX0.ZNxwFnhTQOWKiLrdtTWsJDNLXRmc9T3tDtmE87HxrVA";

// SecureStore limita cada valor a 2048 bytes: la sesión se parte en trozos.
const SECURE_CHUNK_SIZE = 1800;

// Lee los trozos count/0/1/.. bajo el prefijo dado (sin el sufijo __active).
// Devuelve null si falta cualquier trozo (escritura vieja incompleta/corrupta).
const readChunks = async (prefix: string): Promise<string | null> => {
  const count = await SecureStore.getItemAsync(`${prefix}__count`);
  if (!count) return null;
  const chunks: string[] = [];
  for (let i = 0; i < Number(count); i++) {
    const chunk = await SecureStore.getItemAsync(`${prefix}__${i}`);
    if (chunk === null) return null;
    chunks.push(chunk);
  }
  return chunks.join("");
};

// Esquema A/B: la sesión nueva se escribe completa en el espacio inactivo, y solo
// al final se cambia `__active` (una sola clave) para apuntar a ella. Si la app se
// cierra a mitad de la escritura (p. ej. Android la mata durante la renovación
// automática del token en segundo plano), la sesión anterior — completa y válida —
// sigue siendo la que se usa, en vez de quedar una mezcla de trozos viejos y nuevos
// que Supabase rechaza como refresh token inválido y fuerza un logout silencioso.
const SecureStoreAdapter = {
  getItem: async (key: string) => {
    const active = await SecureStore.getItemAsync(`${key}__active`);
    if (active === "a" || active === "b") {
      const value = await readChunks(`${key}__${active}`);
      if (value !== null) return value;
    }
    // Compatibilidad: sesión guardada con el esquema viejo (sin __active todavía).
    const legacy = await readChunks(key);
    if (legacy !== null) return legacy;
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    const current = await SecureStore.getItemAsync(`${key}__active`);
    const next = current === "a" ? "b" : "a";
    const prefix = `${key}__${next}`;

    const chunks = value.match(new RegExp(`.{1,${SECURE_CHUNK_SIZE}}`, "gs")) ?? [];
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${prefix}__${i}`, chunks[i]);
    }
    await SecureStore.setItemAsync(`${prefix}__count`, String(chunks.length));

    // Punto de "commit": recién aquí la sesión nueva queda activa.
    await SecureStore.setItemAsync(`${key}__active`, next);
  },
  removeItem: async (key: string) => {
    for (const slot of ["a", "b"]) {
      const prefix = `${key}__${slot}`;
      const count = await SecureStore.getItemAsync(`${prefix}__count`);
      for (let i = 0; i < Number(count ?? 0); i++) {
        await SecureStore.deleteItemAsync(`${prefix}__${i}`);
      }
      await SecureStore.deleteItemAsync(`${prefix}__count`);
    }
    await SecureStore.deleteItemAsync(`${key}__active`);
    // Limpieza del esquema viejo, por si quedó algo de antes de este fix.
    const legacyCount = await SecureStore.getItemAsync(`${key}__count`);
    for (let i = 0; i < Number(legacyCount ?? 0); i++) {
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
