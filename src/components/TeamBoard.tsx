"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Loader2 } from "lucide-react";

interface MemberProgress {
  user_id: string;
  display_name: string;
  progress: number; // percentage
  memorisedCount: number;
  last_active: string;
}

export function TeamBoard({ groupId, chapterTitle, totalChunks }: { groupId: string, chapterTitle: string, totalChunks: number }) {
  const [members, setMembers] = useState<MemberProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      // 1. Get all members of the group
      const { data: membersData } = await supabase
        .from('group_members')
        .select(`
          user_id,
          profiles:user_id (display_name, last_active)
        `)
        .eq('group_id', groupId);

      if (!membersData) {
        setLoading(false);
        return;
      }

      // 2. Get progress for the current chapter for these users
      const { data: progressData } = await supabase
        .from('shared_progress')
        .select('user_id, is_memorised')
        .eq('group_id', groupId)
        .eq('chapter_title', chapterTitle)
        .eq('is_memorised', true);

      const memberList: MemberProgress[] = membersData.map((m: any) => {
        const userProgress = (progressData as any[])?.filter((p: any) => p.user_id === m.user_id).length || 0;
        return {
          user_id: m.user_id,
          display_name: m.profiles.display_name || "Student",
          progress: totalChunks > 0 ? (userProgress / totalChunks) * 100 : 0,
          memorisedCount: userProgress,
          last_active: m.profiles.last_active
        };
      });

      setMembers(memberList.sort((a, b) => b.progress - a.progress));
      setLoading(false);
    };

    fetchProgress();

    // Subscribe to realtime progress updates
    const subscription = supabase
      .channel('progress_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'shared_progress',
        filter: `group_id=eq.${groupId}`
      }, () => {
        fetchProgress();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [groupId, chapterTitle, totalChunks]);

  if (loading) return (
    <div className="flex justify-center p-8">
      <Loader2 className="animate-spin text-zinc-700" size={24} />
    </div>
  );

  if (members.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider px-1 flex items-center gap-2">
        <Users size={14} />
        Team Progress Board
      </h3>
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="divide-y divide-zinc-800">
          {members.map((member) => (
            <div key={member.user_id} className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-bold text-zinc-400 border border-white/5">
                    {member.display_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{member.display_name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                      {member.memorisedCount} / {totalChunks} Chunks • {Math.round(member.progress)}% Mastered
                    </p>
                  </div>
                </div>
                {member.last_active && (
                  <span className="text-[10px] text-zinc-600 font-medium">
                    Active {new Date(member.last_active).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
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
