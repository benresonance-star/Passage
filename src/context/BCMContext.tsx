"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { BCMState } from "@/types";
import { INITIAL_STATE, loadState, saveState } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { getChapterSlug } from "@/lib/parser";
import { shouldResetStreak } from "@/lib/streak";

interface BCMContextType {
  state: BCMState;
  setState: React.Dispatch<React.SetStateAction<BCMState>>;
  isHydrated: boolean;
  userGroupId: string | null;
  syncProgress: (chapterTitle: string, chunkId: string, card: any) => Promise<void>;
  syncAllMemorised: () => Promise<void>;
  pushChapter: (chapter: any) => Promise<void>;
  pullVault: () => Promise<void>;
  deleteChapter: (chapterId: string) => Promise<void>;
}

const BCMContext = createContext<BCMContextType | undefined>(undefined);

export function BCMProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BCMState>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [userGroupId, setUserGroupId] = useState<string | null>(null);
  const { user } = useAuth();
  const lastUpdateRef = React.useRef<Record<string, number>>({});

  // Load group ID and pull vault if logged in
  useEffect(() => {
    let cardSubscription: any = null;
    let chapterSubscription: any = null;

    if (user && supabase) {
      const client = supabase; // Narrow for closures
      const initCloud = async () => {
        // 1. Fetch Group ID
        const { data } = await client
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) setUserGroupId(data.group_id);

        // 2. Initial Pull
        await pullVault();

        // 3. Subscribe to Realtime Vault Changes
        cardSubscription = client
          .channel(`vault_cards_${user.id}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'user_cards',
            filter: `user_id=eq.${user.id}`
          }, (payload: any) => {
            if (payload.new && payload.new.data) {
              const updatedCard = payload.new.data;
              const chapterId = payload.new.chapter_id;
              const chunkId = payload.new.chunk_id;
              const cloudUpdatedAt = new Date(payload.new.updated_at).getTime();
              const lastLocal = lastUpdateRef.current[`card_${chunkId}`] || 0;

              // Authoritative Mirroring: Cloud wins if it's newer than our last action on this chunk
              if (cloudUpdatedAt > lastLocal) {
                setState(prev => {
                  if (JSON.stringify(prev.cards[chapterId]?.[chunkId]) === JSON.stringify(updatedCard)) return prev;
                  return {
                    ...prev,
                    cards: {
                      ...prev.cards,
                      [chapterId]: {
                        ...(prev.cards[chapterId] || {}),
                        [chunkId]: updatedCard
                      }
                    }
                  };
                });
              }
            }
          })
          .subscribe();

        chapterSubscription = client
          .channel(`vault_chapters_${user.id}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'user_chapters',
            filter: `user_id=eq.${user.id}`
          }, (payload: any) => {
            if (payload.new && payload.new.data) {
              const updatedChapter = payload.new.data;
              const chapterId = payload.new.chapter_id;
              setState(prev => ({
                ...prev,
                chapters: {
                  ...prev.chapters,
                  [chapterId]: updatedChapter
                }
              }));
            }
          })
          .subscribe();
      };
      initCloud();
    } else {
      setUserGroupId(null);
    }

    return () => {
      if (cardSubscription) cardSubscription.unsubscribe();
      if (chapterSubscription) chapterSubscription.unsubscribe();
    };
  }, [user]);

  const syncProgress = async (chapterTitle: string, chunkId: string, card: any) => {
    if (!user || !supabase) return;
    const client = supabase;

    const chapterId = getChapterSlug(chapterTitle);
    
    // Track local update time to prevent "echo" overwrites
    lastUpdateRef.current[`card_${chunkId}`] = Date.now();

    try {
      // 1. Sync to Public Team Board
      let gid = userGroupId;
      if (!gid) {
        const { data } = await client
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) {
          gid = data.group_id;
          setUserGroupId(gid);
        }
      }

      if (gid) {
        await client.from('shared_progress').upsert({
          group_id: gid,
          user_id: user.id,
          chapter_title: chapterTitle,
          chunk_id: chunkId,
          is_memorised: card.isMemorised,
          updated_at: new Date().toISOString()
        }, { onConflict: 'group_id,user_id,chapter_title,chunk_id' });
      }

      // 2. Sync to Personal Vault
      const { data: cardData } = await client.from('user_cards').upsert({
        user_id: user.id,
        chapter_id: chapterId,
        chunk_id: chunkId,
        data: card,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,chapter_id,chunk_id' }).select('updated_at').single();

      if (cardData) {
        lastUpdateRef.current[`card_${chunkId}`] = new Date(cardData.updated_at).getTime();
      }

      // Also sync stats
      const stats = state.stats[chapterId];
      if (stats) {
        await client.from('user_stats').upsert({
          user_id: user.id,
          chapter_id: chapterId,
          data: stats,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,chapter_id' });
      }
    } catch (err) {
      console.error("Sync error:", err);
    }
  };

  const pushChapter = async (chapter: any) => {
    if (!user || !supabase) return;
    const client = supabase;
    try {
      await client.from('user_chapters').upsert({
        user_id: user.id,
        chapter_id: chapter.id,
        data: chapter,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,chapter_id' });
    } catch (err) {
      console.error("Push chapter error:", err);
    }
  };

  const pullVault = async () => {
    if (!user || !supabase) return;
    const client = supabase;

    try {
      console.log("Pulling personal vault...");
      
      const { data: chapters } = await client.from('user_chapters').select('*').eq('user_id', user.id);
      const { data: cards } = await client.from('user_cards').select('*').eq('user_id', user.id);
      const { data: stats } = await client.from('user_stats').select('*').eq('user_id', user.id);

      if (!chapters && !cards && !stats) return;

      setState(prev => {
        const newState = { ...prev };
        const now = Date.now();
        
        // Merge chapters
        chapters?.forEach((row: any) => {
          newState.chapters[row.chapter_id] = row.data;
        });

        // Merge cards with conflict resolution
        cards?.forEach((row: any) => {
          const lastLocal = lastUpdateRef.current[`card_${row.chunk_id}`] || 0;
          const cloudTime = new Date(row.updated_at).getTime();
          
          // Authoritative Merge: Cloud wins if it's newer than our last action
          if (cloudTime > lastLocal) {
            if (!newState.cards[row.chapter_id]) newState.cards[row.chapter_id] = {};
            newState.cards[row.chapter_id][row.chunk_id] = row.data;
            // Align local sync time with cloud
            lastUpdateRef.current[`card_${row.chunk_id}`] = cloudTime;
          }
        });

        // Merge stats
        stats?.forEach((row: any) => {
          newState.stats[row.chapter_id] = row.data;
        });

        return newState;
      });

      console.log("Vault pulled and merged.");
    } catch (err) {
      console.error("Pull vault error:", err);
    }
  };

  const syncAllMemorised = async () => {
    if (!user || !supabase) return;
    const client = supabase;

    try {
      const { data: memberData } = await client
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (!memberData || memberData.length === 0) return;

      const allSyncs: PromiseLike<unknown>[] = [];
      
      Object.entries(state.chapters).forEach(([chapterId, chapter]) => {
        const chapterCards = state.cards[chapterId] || {};
        Object.entries(chapterCards).forEach(([chunkId, card]) => {
          if (card.isMemorised) {
            memberData.forEach((member) => {
              allSyncs.push(
                client.from('shared_progress').upsert({
                  group_id: member.group_id,
                  user_id: user.id,
                  chapter_title: chapter.title,
                  chunk_id: chunkId,
                  is_memorised: true,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'group_id,user_id,chapter_title,chunk_id' })
              );
            });
          }
        });
      });

      if (allSyncs.length > 0) {
        await Promise.all(allSyncs);
      }
    } catch (err) {
      console.error("Bulk sync error:", err);
    }
  };

  const deleteChapter = async (chapterId: string) => {
    // 1. Remove from local state
    setState(prev => {
      const { [chapterId]: _, ...remainingChapters } = prev.chapters;
      const { [chapterId]: __, ...remainingCards } = prev.cards;
      const { [chapterId]: ___, ...remainingStats } = prev.stats;
      const { [chapterId]: ____, ...remainingActiveChunks } = prev.settings.activeChunkId;

      return {
        ...prev,
        chapters: remainingChapters,
        selectedChapterId: prev.selectedChapterId === chapterId
          ? (Object.keys(remainingChapters)[0] || null)
          : prev.selectedChapterId,
        cards: remainingCards,
        stats: remainingStats,
        settings: {
          ...prev.settings,
          activeChunkId: remainingActiveChunks,
        },
      };
    });

    // 2. Remove from Supabase if logged in
    if (user && supabase) {
      const client = supabase;
      try {
        await Promise.all([
          client.from('user_chapters').delete().eq('user_id', user.id).eq('chapter_id', chapterId),
          client.from('user_cards').delete().eq('user_id', user.id).eq('chapter_id', chapterId),
          client.from('user_stats').delete().eq('user_id', user.id).eq('chapter_id', chapterId),
        ]);

        // Also clean shared_progress if in a group
        const gid = userGroupId;
        if (gid) {
          const chapter = state.chapters[chapterId];
          if (chapter) {
            await client.from('shared_progress').delete()
              .eq('group_id', gid)
              .eq('user_id', user.id)
              .eq('chapter_title', chapter.title);
          }
        }
      } catch (err) {
        console.error("Delete chapter sync error:", err);
      }
    }
  };

  useEffect(() => {
    const saved = loadState();
    
    // Authoritative Migration: Force all chapters to use Title Slugs as IDs
    const migratedState = { ...saved };
    let hasChanges = false;

    Object.entries(saved.chapters).forEach(([oldId, chapter]) => {
      const newId = getChapterSlug(chapter.title);
      let chapterWasMigrated = false;

      // 1. Migrate Chapter ID if needed
      if (newId !== oldId) {
        console.log(`Migrating Chapter: ${oldId} -> ${newId}`);
        delete migratedState.chapters[oldId];
        migratedState.chapters[newId] = { ...chapter, id: newId };
        
        if (migratedState.cards[oldId]) {
          migratedState.cards[newId] = migratedState.cards[oldId];
          delete migratedState.cards[oldId];
        }
        if (migratedState.stats[oldId]) {
          migratedState.stats[newId] = migratedState.stats[oldId];
          delete migratedState.stats[oldId];
        }
        if (migratedState.settings.activeChunkId[oldId]) {
          migratedState.settings.activeChunkId[newId] = migratedState.settings.activeChunkId[oldId];
          delete migratedState.settings.activeChunkId[oldId];
        }
        if (migratedState.selectedChapterId === oldId) {
          migratedState.selectedChapterId = newId;
        }
        chapterWasMigrated = true;
        hasChanges = true;
      }

      // 2. Migrate Chunk IDs within the chapter
      const currentChapter = migratedState.chapters[newId];
      const oldCards = { ...(migratedState.cards[newId] || {}) };
      let chunksWereMigrated = false;

      currentChapter.chunks.forEach((chunk, index) => {
        const startVerse = chunk.verses.filter(v => v.type === "scripture")[0]?.number;
        const lastVerse = chunk.verses.filter(v => v.type === "scripture").slice(-1)[0]?.number;
        const verseRange = startVerse === lastVerse ? `${startVerse}` : `${startVerse}-${lastVerse}`;
        const newChunkId = `${newId}-v${verseRange}`;

        if (chunk.id !== newChunkId) {
          console.log(`Migrating Chunk: ${chunk.id} -> ${newChunkId}`);
          const oldChunkId = chunk.id;
          chunk.id = newChunkId;
          
          // Migrate card data for this chunk
          if (oldCards[oldChunkId]) {
            if (!migratedState.cards[newId]) migratedState.cards[newId] = {};
            migratedState.cards[newId][newChunkId] = { ...oldCards[oldChunkId], id: newChunkId };
            delete migratedState.cards[newId][oldChunkId];
          }

          // Update active chunk if needed
          if (migratedState.settings.activeChunkId[newId] === oldChunkId) {
            migratedState.settings.activeChunkId[newId] = newChunkId;
          }

          chunksWereMigrated = true;
          hasChanges = true;
        }
      });
    });

    // Check for streak reset on load
    Object.keys(migratedState.stats).forEach(chapterId => {
      const stats = migratedState.stats[chapterId];
      if (shouldResetStreak(stats.lastActivity)) {
        stats.streak = 0;
      }
    });
    
    setState(migratedState);
    setIsHydrated(true);
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (isHydrated) {
      saveState(state);

      // Sync to Supabase if logged in
      if (user && supabase) {
        const client = supabase;
        // De-bounce theme sync to prevent excessive calls
        const syncTheme = setTimeout(() => {
          if (state.settings.theme) {
            client.from('profiles').update({ 
              theme: state.settings.theme,
              last_active: new Date().toISOString()
            }).eq('id', user.id).then();
          }
        }, 2000);

        return () => clearTimeout(syncTheme);
      }
    }
  }, [state, isHydrated, user]);

  return (
    <BCMContext.Provider value={{ state, setState, isHydrated, userGroupId, syncProgress, syncAllMemorised, pushChapter, pullVault, deleteChapter }}>
      {children}
    </BCMContext.Provider>
  );
}

export function useBCM() {
  const context = useContext(BCMContext);
  if (context === undefined) {
    throw new Error("useBCM must be used within a BCMProvider");
  }
  return context;
}
