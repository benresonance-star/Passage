"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, AuthError, Session } from '@supabase/supabase-js';

interface AuthResult {
  error: AuthError | { message: string } | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string) => Promise<AuthResult>;
  verifyOtp: (email: string, token: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = supabase; // Narrow for closures

    // Check active sessions and sets the user
    const getSession = async () => {
      try {
        const { data: { session } } = await client.auth.getSession();
        setUser(session?.user ?? null);
      } catch (err) {
        console.error("Error fetching session:", err);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          if (url.hash.includes("access_token") || url.searchParams.has("code")) {
            url.hash = "";
            url.searchParams.delete("code");
            window.history.replaceState(null, "", url.pathname + url.search);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string) => {
    if (!supabase) return { error: { message: "Supabase not initialized" } };
    return await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.href : '',
      },
    });
  };

  const verifyOtp = async (email: string, token: string) => {
    if (!supabase) return { error: { message: "Supabase not initialized" } };
    return await supabase.auth.verifyOtp({
      email,
      token,
      type: 'magiclink',
    });
  };

  const signOut = async () => {
    if (!supabase) return { error: { message: "Supabase not initialized" } };
    return await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
