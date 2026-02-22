"use client";

import { Loader2 } from "lucide-react";

interface JoinGroupFormProps {
  joinGroupId: string;
  onJoinGroupIdChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  isPreviewLoading: boolean;
  previewGroup: { id: string; name: string; admin_name: string } | null;
}

export function JoinGroupForm({
  joinGroupId,
  onJoinGroupIdChange,
  onSubmit,
  loading,
  isPreviewLoading,
  previewGroup,
}: JoinGroupFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest ml-1">
          Join with Group ID
        </label>
        <div className="relative">
          <input
            required
            value={joinGroupId}
            onChange={(e) => onJoinGroupIdChange(e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--surface-border)] rounded-2xl py-4 px-6 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
            placeholder="Paste ID here..."
            aria-label="Group ID"
          />
          {isPreviewLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="animate-spin text-orange-500" size={18} />
            </div>
          )}
        </div>
      </div>

      {previewGroup && (
        <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 animate-in zoom-in-95 duration-200">
          <p className="text-[10px] text-orange-500 uppercase font-bold tracking-widest mb-1">Group Found</p>
          <p className="text-sm font-bold text-white">{previewGroup.name}</p>
          <p className="text-[10px] text-zinc-500">Admin: {previewGroup.admin_name}</p>
        </div>
      )}

      <button
        disabled={loading || !joinGroupId || isPreviewLoading}
        className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-transform disabled:opacity-50"
      >
        {loading ? "Joining..." : "Join Group"}
      </button>
    </form>
  );
}
