"use client";

import { X } from "lucide-react";
import type { GroupMemberWithProfile } from "@/types";

interface MemberListProps {
  members: GroupMemberWithProfile[];
  currentUserId: string;
  isAdmin: boolean;
  selectedChapterId: string | null;
  localMemorisedCount: number;
  totalChunks: number;
  memberProgress: Record<string, number>;
  onRemoveMember: (userId: string, displayName: string) => void;
}

export function MemberList({
  members,
  currentUserId,
  isAdmin,
  selectedChapterId,
  localMemorisedCount,
  totalChunks,
  memberProgress,
  onRemoveMember,
}: MemberListProps) {
  return (
    <div className="bg-[var(--surface)] glass border border-[var(--surface-border)] rounded-3xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-[var(--surface-border)] bg-[var(--surface-alt)]">
        <p className={`text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest`}>
          Group Members ({members.length})
        </p>
      </div>
      <div className="divide-y divide-[var(--surface-border)]">
        {members.map((m) => (
          <div key={m.user_id} className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg bg-[var(--surface-alt)] border border-[var(--surface-border)] flex items-center justify-center text-xs font-bold text-[var(--muted)]`}>
                {m.profiles.display_name?.charAt(0).toUpperCase() || "S"}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {m.profiles.display_name || "Student"}
                  {m.user_id === currentUserId && <span className="text-orange-500 ml-2 text-[10px] uppercase font-bold">(You)</span>}
                </p>
                <div className="flex items-center gap-2">
                  <p className={`text-[10px] text-[var(--muted)]`}>{m.profiles.email}</p>
                  {selectedChapterId && (
                    <>
                      <span className="text-[var(--muted-strong)] text-[10px]">•</span>
                      <p className="text-[10px] text-orange-500/80 font-bold uppercase tracking-tight">
                        {m.user_id === currentUserId
                          ? localMemorisedCount
                          : (memberProgress[m.user_id] || 0)
                        } / {totalChunks} Chunks
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {m.role === "admin" ? (
                <span className={`text-[9px] font-bold uppercase tracking-tighter px-2 py-0.5 bg-[var(--surface-alt)] text-[var(--muted)] rounded-full border border-[var(--surface-border)]`}>
                  Admin
                </span>
              ) : (
                isAdmin && (
                  <button
                    onClick={() => onRemoveMember(m.user_id, m.profiles.display_name || "")}
                    className={`p-2 text-[var(--muted-strong)] hover:text-red-500 transition-colors bg-[var(--surface-alt)] rounded-lg border border-[var(--surface-border)]`}
                    aria-label={`Remove ${m.profiles.display_name || "member"}`}
                  >
                    <X size={14} />
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
