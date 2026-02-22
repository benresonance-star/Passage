import { supabase } from "@/lib/supabase";
import type { SM2Card, Chapter, ChapterStats, DbUserChapter, DbUserCard, DbUserStats } from "@/types";

function getClient() {
  if (!supabase) throw new Error("Supabase not initialized");
  return supabase;
}

export async function fetchVault(userId: string) {
  const client = getClient();

  const [chaptersRes, cardsRes, statsRes] = await Promise.all([
    client.from("user_chapters").select("*").eq("user_id", userId),
    client.from("user_cards").select("*").eq("user_id", userId),
    client.from("user_stats").select("*").eq("user_id", userId),
  ]);

  return {
    chapters: (chaptersRes.data as DbUserChapter[] | null) ?? [],
    cards: (cardsRes.data as DbUserCard[] | null) ?? [],
    stats: (statsRes.data as DbUserStats[] | null) ?? [],
  };
}

export async function upsertCard(userId: string, chapterId: string, chunkId: string, card: SM2Card) {
  const client = getClient();
  const { data } = await client
    .from("user_cards")
    .upsert(
      {
        user_id: userId,
        chapter_id: chapterId,
        chunk_id: chunkId,
        data: card,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,chapter_id,chunk_id" }
    )
    .select("updated_at")
    .single();

  return data;
}

export async function upsertChapter(userId: string, chapter: Chapter) {
  const client = getClient();
  await client.from("user_chapters").upsert(
    {
      user_id: userId,
      chapter_id: chapter.id,
      data: chapter,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,chapter_id" }
  );
}

export async function upsertStats(userId: string, chapterId: string, stats: ChapterStats) {
  const client = getClient();
  await client.from("user_stats").upsert(
    {
      user_id: userId,
      chapter_id: chapterId,
      data: stats,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,chapter_id" }
  );
}

export async function deleteChapterData(userId: string, chapterId: string) {
  const client = getClient();
  await Promise.all([
    client.from("user_chapters").delete().eq("user_id", userId).eq("chapter_id", chapterId),
    client.from("user_cards").delete().eq("user_id", userId).eq("chapter_id", chapterId),
    client.from("user_stats").delete().eq("user_id", userId).eq("chapter_id", chapterId),
  ]);
}

export async function syncSharedProgress(
  groupIds: string[],
  userId: string,
  chapterTitle: string,
  chunkId: string,
  isMemorised: boolean
) {
  const client = getClient();
  const promises = groupIds.map((gid) =>
    client.from("shared_progress").upsert(
      {
        group_id: gid,
        user_id: userId,
        chapter_title: chapterTitle,
        chunk_id: chunkId,
        is_memorised: isMemorised,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id,user_id,chapter_title,chunk_id" }
    )
  );
  await Promise.all(promises);
}

export async function deleteSharedProgress(groupIds: string[], userId: string, chapterTitle: string) {
  const client = getClient();
  const promises = groupIds.map((gid) =>
    client
      .from("shared_progress")
      .delete()
      .eq("group_id", gid)
      .eq("user_id", userId)
      .eq("chapter_title", chapterTitle)
  );
  await Promise.all(promises);
}
