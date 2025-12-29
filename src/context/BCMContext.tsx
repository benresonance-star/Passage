"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { BCMState } from "@/types";
import { INITIAL_STATE, loadState, saveState } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { getChapterSlug } from "@/lib/parser";

interface BCMContextType {
  state: BCMState;
  setState: React.Dispatch<React.SetStateAction<BCMState>>;
  isHydrated: boolean;
  userGroupId: string | null;
  syncProgress: (chapterTitle: string, chunkId: string, card: any) => Promise<void>;
  syncAllMemorised: () => Promise<void>;
  pushChapter: (chapter: any) => Promise<void>;
  pullVault: () => Promise<void>;
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
      const initCloud = async () => {
        // 1. Fetch Group ID
        const { data } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) setUserGroupId(data.group_id);

        // 2. Initial Pull
        await pullVault();

        // 3. Subscribe to Realtime Vault Changes
        cardSubscription = supabase
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

        chapterSubscription = supabase
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

    const chapterId = getChapterSlug(chapterTitle);
    
    // Track local update time to prevent "echo" overwrites
    lastUpdateRef.current[`card_${chunkId}`] = Date.now();

    try {
      // 1. Sync to Public Team Board
      let gid = userGroupId;
      if (!gid) {
        const { data } = await supabase
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
        await supabase.from('shared_progress').upsert({
          group_id: gid,
          user_id: user.id,
          chapter_title: chapterTitle,
          chunk_id: chunkId,
          is_memorised: card.isMemorised,
          updated_at: new Date().toISOString()
        }, { onConflict: 'group_id,user_id,chapter_title,chunk_id' });
      }

      // 2. Sync to Personal Vault
      const { data: cardData } = await supabase.from('user_cards').upsert({
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
        await supabase.from('user_stats').upsert({
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
    try {
      await supabase.from('user_chapters').upsert({
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

    try {
      console.log("Pulling personal vault...");
      
      const { data: chapters } = await supabase.from('user_chapters').select('*').eq('user_id', user.id);
      const { data: cards } = await supabase.from('user_cards').select('*').eq('user_id', user.id);
      const { data: stats } = await supabase.from('user_stats').select('*').eq('user_id', user.id);

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

    try {
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (!memberData || memberData.length === 0) return;

      const allSyncs: any[] = [];
      
      Object.entries(state.chapters).forEach(([chapterId, chapter]) => {
        const chapterCards = state.cards[chapterId] || {};
        Object.entries(chapterCards).forEach(([chunkId, card]) => {
          if (card.isMemorised) {
            memberData.forEach((member: any) => {
              allSyncs.push(
                supabase.from('shared_progress').upsert({
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

  useEffect(() => {
    const saved = loadState();
    
    // Authoritative Migration: Force all chapters to use Title Slugs as IDs
    const migratedState = { ...saved };
    let hasChanges = false;

    Object.entries(saved.chapters).forEach(([oldId, chapter]) => {
      const newId = getChapterSlug(chapter.title);
      if (newId !== oldId) {
        console.log(`Migrating ${oldId} -> ${newId}`);
        // Move chapter
        delete migratedState.chapters[oldId];
        migratedState.chapters[newId] = { ...chapter, id: newId };
        
        // Move cards
        if (migratedState.cards[oldId]) {
          migratedState.cards[newId] = migratedState.cards[oldId];
          delete migratedState.cards[oldId];
        }

        // Move stats
        if (migratedState.stats[oldId]) {
          migratedState.stats[newId] = migratedState.stats[oldId];
          delete migratedState.stats[oldId];
        }

        // Move active chunk settings
        if (migratedState.settings.activeChunkId[oldId]) {
          migratedState.settings.activeChunkId[newId] = migratedState.settings.activeChunkId[oldId];
          delete migratedState.settings.activeChunkId[oldId];
        }

        // Update selected chapter
        if (migratedState.selectedChapterId === oldId) {
          migratedState.selectedChapterId = newId;
        }

        hasChanges = true;
      }
    });

    // Check for streak reset on load
    Object.keys(migratedState.stats).forEach(chapterId => {
      const stats = migratedState.stats[chapterId];
      if (stats.lastActivity) {
        const now = new Date();
        const lastActivity = new Date(stats.lastActivity);
        const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastDate = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());
        const diffInDays = Math.floor((nowDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffInDays > 1) {
          stats.streak = 0;
        }
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
        // De-bounce theme sync to prevent excessive calls
        const syncTheme = setTimeout(() => {
          if (state.settings.theme) {
            supabase.from('profiles').update({ 
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
    <BCMContext.Provider value={{ state, setState, isHydrated, userGroupId, syncProgress, syncAllMemorised, pushChapter, pullVault }}>
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
