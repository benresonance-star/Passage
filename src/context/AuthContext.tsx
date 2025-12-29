"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string) => Promise<{ error: any }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
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

    // Check active sessions and sets the user
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // Clean the URL if we just signed in via a Magic Link
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          window.history.replaceState(null, "", window.location.pathname);
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
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : '',
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
