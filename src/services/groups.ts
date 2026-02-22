import { supabase } from "@/lib/supabase";
import type { DbGroup, GroupMemberWithProfile } from "@/types";

function getClient() {
  if (!supabase) throw new Error("Supabase not initialized");
  return supabase;
}

export async function fetchUserGroups(userId: string) {
  const client = getClient();
  const { data } = await client
    .from("group_members")
    .select("group_id, groups(*)")
    .eq("user_id", userId);

  if (!data || data.length === 0) return [];
  return data.map((m) => m.groups as unknown as DbGroup);
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMemberWithProfile[]> {
  const client = getClient();
  const { data } = await client
    .from("group_members")
    .select(`user_id, role, profiles:user_id (display_name, email, last_active)`)
    .eq("group_id", groupId);

  return (data as unknown as GroupMemberWithProfile[]) ?? [];
}

export async function fetchGroupMemberProgress(groupId: string, chapterTitle: string) {
  const client = getClient();
  const { data } = await client
    .from("shared_progress")
    .select("user_id, is_memorised")
    .eq("group_id", groupId)
    .eq("chapter_title", chapterTitle)
    .eq("is_memorised", true);

  if (!data) return {};
  const counts: Record<string, number> = {};
  data.forEach((p) => {
    counts[p.user_id] = (counts[p.user_id] || 0) + 1;
  });
  return counts;
}

export async function createGroup(name: string, adminId: string) {
  const client = getClient();
  const { data, error } = await client
    .from("groups")
    .insert({ name, admin_id: adminId })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Failed to create group");

  await client
    .from("group_members")
    .insert({ group_id: data.id, user_id: adminId, role: "admin" });

  return data as DbGroup;
}

export async function joinGroup(groupId: string, userId: string) {
  const client = getClient();

  const { data: existing } = await client
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (existing) throw new Error("You are already a member of this group.");

  const { error } = await client
    .from("group_members")
    .insert({ group_id: groupId, user_id: userId, role: "member" });

  if (error) throw error;
}

export async function leaveGroup(groupId: string, userId: string, isLastMember: boolean, isAdmin: boolean, members: GroupMemberWithProfile[]) {
  const client = getClient();

  if (isLastMember) {
    const { error } = await client.from("groups").delete().eq("id", groupId);
    if (error) throw error;
    return;
  }

  if (isAdmin) {
    const nextAdmin = members.find((m) => m.user_id !== userId);
    if (nextAdmin) {
      const { error: groupErr } = await client.from("groups").update({ admin_id: nextAdmin.user_id }).eq("id", groupId);
      if (groupErr) throw groupErr;
      const { error: memberErr } = await client.from("group_members").update({ role: "admin" }).eq("group_id", groupId).eq("user_id", nextAdmin.user_id);
      if (memberErr) throw memberErr;
    }
  }

  const { error } = await client.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
  if (error) throw error;
}

export async function removeMember(groupId: string, targetUserId: string) {
  const client = getClient();
  const { error } = await client
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", targetUserId);

  if (error) throw error;
}

export async function fetchGroupPreview(groupId: string) {
  const client = getClient();
  const { data } = await client
    .from("groups")
    .select(`id, name, profiles:admin_id (display_name)`)
    .eq("id", groupId.trim())
    .maybeSingle();

  if (!data) return null;
  const adminProfile = data.profiles as unknown as { display_name?: string } | null;
  return {
    id: data.id as string,
    name: data.name as string,
    admin_name: adminProfile?.display_name || "Unknown Admin",
  };
}
