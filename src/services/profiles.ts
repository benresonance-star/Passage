import { supabase } from "@/lib/supabase";
import type { DbProfile } from "@/types";

function getClient() {
  if (!supabase) throw new Error("Supabase not initialized");
  return supabase;
}

export async function fetchProfile(userId: string): Promise<DbProfile | null> {
  const client = getClient();
  const { data } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return data as DbProfile | null;
}

export async function updateDisplayName(userId: string, displayName: string) {
  const client = getClient();
  const { error } = await client
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", userId);

  if (error) throw error;
}
