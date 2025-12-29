"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { BCMState } from "@/types";
import { INITIAL_STATE, loadState, saveState } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

interface BCMContextType {
  state: BCMState;
  setState: React.Dispatch<React.SetStateAction<BCMState>>;
  isHydrated: boolean;
  userGroupId: string | null;
  syncProgress: (chapterTitle: string, chunkId: string, isMemorised: boolean) => Promise<void>;
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

  // Load group ID and pull vault if logged in
  useEffect(() => {
    if (user && supabase) {
      const initCloud = async () => {
        // 1. Fetch Group ID
        const { data } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) setUserGroupId(data.group_id);

        // 2. Pull Personal Vault
        await pullVault();
      };
      initCloud();
    } else {
      setUserGroupId(null);
    }
  }, [user]);

  const syncProgress = async (chapterTitle: string, chunkId: string, isMemorised: boolean) => {
    if (!user || !supabase) return;

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
          is_memorised: isMemorised,
          updated_at: new Date().toISOString()
        }, { onConflict: 'group_id,user_id,chapter_title,chunk_id' });
      }

      // 2. Sync to Personal Vault
      const chapterId = Object.entries(state.chapters).find(([_, ch]) => ch.title === chapterTitle)?.[0];
      if (chapterId) {
        const card = state.cards[chapterId]?.[chunkId];
        if (card) {
          await supabase.from('user_cards').upsert({
            user_id: user.id,
            chapter_id: chapterId,
            chunk_id: chunkId,
            data: card,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,chapter_id,chunk_id' });
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
      
      // 1. Pull Chapters
      const { data: chapters } = await supabase.from('user_chapters').select('*').eq('user_id', user.id);
      
      // 2. Pull Cards
      const { data: cards } = await supabase.from('user_cards').select('*').eq('user_id', user.id);
      
      // 3. Pull Stats
      const { data: stats } = await supabase.from('user_stats').select('*').eq('user_id', user.id);

      if (!chapters && !cards && !stats) return;

      setState(prev => {
        const newState = { ...prev };
        
        // Merge chapters
        chapters?.forEach((row: any) => {
          newState.chapters[row.chapter_id] = row.data;
        });

        // Merge cards
        cards?.forEach((row: any) => {
          if (!newState.cards[row.chapter_id]) newState.cards[row.chapter_id] = {};
          newState.cards[row.chapter_id][row.chunk_id] = row.data;
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

  // Load state on mount
  useEffect(() => {
    const saved = loadState();
    
    // Check for streak reset on load for all chapters
    Object.keys(saved.stats).forEach(chapterId => {
      const stats = saved.stats[chapterId];
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
    
    setState(saved);
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
