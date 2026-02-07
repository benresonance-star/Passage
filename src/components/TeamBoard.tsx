"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Loader2 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useBCM } from "@/context/BCMContext";

interface MemberProgress {
  user_id: string;
  display_name: string;
  progress: number; // percentage
  memorisedCount: number;
  last_active?: string;
}

export function TeamBoard({ groupId, groupName, chapterTitle, totalChunks }: { groupId: string, groupName: string, chapterTitle: string, totalChunks: number }) {
  const { user } = useAuth();
  const { state } = useBCM();
  const [members, setMembers] = useState<MemberProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = supabase; // Narrow for closures

    const fetchProgress = async () => {
      try {
        // 1. Get all members of the group
        const { data: membersData, error: mError } = await client
          .from('group_members')
          .select(`
            user_id,
            profiles:user_id (display_name, last_active)
          `)
          .eq('group_id', groupId);

        if (mError) throw mError;
        if (!membersData) {
          setLoading(false);
          return;
        }

        // 2. Get progress for the current chapter for these users
        const { data: progressData, error: pError } = await client
          .from('shared_progress')
          .select('user_id, is_memorised')
          .eq('group_id', groupId)
          .eq('chapter_title', chapterTitle)
          .eq('is_memorised', true);

        if (pError) throw pError;

        const progressList = progressData ?? [];
        const memberList: MemberProgress[] = membersData.map((m: any) => {
          const profiles = m.profiles as { display_name?: string; last_active?: string } | null;
          let userProgress = progressList.filter((p) => p.user_id === m.user_id).length;
          
          // Override with local state for current user to avoid sync lag
          if (user && m.user_id === user.id && state.selectedChapterId) {
            const localCards = state.cards[state.selectedChapterId] || {};
            userProgress = Object.values(localCards).filter(c => c.isMemorised).length;
          }

          return {
            user_id: m.user_id,
            display_name: profiles?.display_name || "Student",
            progress: totalChunks > 0 ? (userProgress / totalChunks) * 100 : 0,
            memorisedCount: userProgress,
            last_active: profiles?.last_active
          };
        });

        setMembers(memberList.sort((a, b) => b.progress - a.progress));
      } catch (err) {
        console.error("TeamBoard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();

    // Subscribe to realtime progress updates
    const subscription = supabase
      .channel(`progress_updates_${groupId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'shared_progress',
        filter: `group_id=eq.${groupId}`
      }, (payload: any) => {
        console.log("Realtime update received:", payload);
        fetchProgress();
      })
      .subscribe((status: any) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [groupId, chapterTitle, totalChunks, refreshCount]);

  if (loading) return (
    <div className="flex justify-center p-8">
      <Loader2 className="animate-spin text-zinc-700" size={24} />
    </div>
  );

  if (members.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <Users size={14} />
          {groupName}
        </h3>
      </div>
      <div className="bg-[var(--surface)] glass border border-[var(--surface-border)] rounded-3xl overflow-hidden shadow-xl">
        <div className="divide-y divide-[var(--surface-border)]">
          {members.map((member) => (
            <div key={member.user_id} className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--surface-alt)] rounded-lg flex items-center justify-center text-xs font-bold text-zinc-400 border border-[var(--surface-border)]">
                    {member.display_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{member.display_name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                      {member.memorisedCount} / {totalChunks} Chunks
                    </p>
                  </div>
                </div>
                {member.last_active && (
                  <span className="text-[10px] text-zinc-600 font-medium">
                    Active {new Date(member.last_active).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-[var(--input-bg)] rounded-full overflow-hidden border border-[var(--surface-border)]">
                <div 
                  className="h-full bg-orange-500 transition-all duration-1000" 
                  style={{ width: `${member.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
