/**
 * Supabase client singleton.
 *
 * Config notes:
 *   - storage: AsyncStorage  — persists the auth session across app restarts
 *   - autoRefreshToken: true — silently refreshes the JWT before it expires
 *   - persistSession: true   — keeps the session alive between cold starts
 *   - detectSessionInUrl:false— we don't use OAuth deep-links on native
 *
 * Environment variables (set in .env / EAS secrets):
 *   EXPO_PUBLIC_SUPABASE_URL      — Supabase project URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY — public anon key (safe to ship)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
