/**
 * AuthContext — authentication state and actions.
 *
 * Wraps Supabase Auth and exposes a simple React context so any component
 * can read the current session and call sign-up / sign-in / sign-out.
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *   const { user, session, loading, signIn, signUp, signOut } = useAuth();
 *
 * ─── Session lifecycle ────────────────────────────────────────────────────────
 *
 *   1. On mount: `getSession()` restores any persisted session from AsyncStorage.
 *   2. `onAuthStateChange` keeps the context in sync when the session changes
 *      (sign-in, sign-out, token refresh, OAuth callback, etc.).
 *
 * ─── Error handling ───────────────────────────────────────────────────────────
 *
 *   signIn / signUp return the AuthError on failure or null on success.
 *   The calling screen is responsible for displaying the error to the user.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  session:  Session | null;
  user:     User    | null;
  /** True while the initial `getSession()` call is in-flight. */
  loading:  boolean;
  /** Creates a new Supabase Auth user. Returns AuthError or null. */
  signUp:  (email: string, password: string, name: string) => Promise<AuthError | null>;
  /** Signs in with email + password. Returns AuthError or null. */
  signIn:  (email: string, password: string) => Promise<AuthError | null>;
  /** Signs out and clears the local session. */
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore persisted session on cold start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Stay in sync with all future auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session),
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // full_name is picked up by the handle_new_user DB trigger to populate profiles.name
      options: { data: { full_name: name } },
    });
    return error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Ctx.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
}

/** Must be called inside <AuthProvider>. Throws if used outside it. */
export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be called inside <AuthProvider>");
  return ctx;
}
