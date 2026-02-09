"use client";

import Link from "next/link";
import { BookOpen, Upload } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  showImportButton?: boolean;
}

export function EmptyState({ 
  message = "No chapter is currently loaded. Please import a chapter to begin.",
  showImportButton = true 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-[var(--surface)] rounded-3xl flex items-center justify-center border border-[var(--surface-border)] shadow-xl relative">
        <BookOpen size={48} className="text-[var(--theme-ui-subtext)] opacity-20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
        </div>
      </div>
      
      <div className="space-y-3 max-w-[280px]">
        <h2 className="text-xl font-bold text-white">Ready to Begin?</h2>
        <p className="text-[var(--theme-ui-subtext)] leading-relaxed">
          {message}
        </p>
      </div>

      {showImportButton && (
        <Link
          href="/import"
          className="flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
        >
          <Upload size={20} />
          Import Chapter
        </Link>
      )}
    </div>
  );
}

