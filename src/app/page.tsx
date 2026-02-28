"use client";

import { useState } from "react";
import Link from "next/link";
import { useBCM } from "@/context/BCMContext";
import { Play, BookOpen, Upload, ChevronRight, Award, Trash2, Trophy, Info, X, Users, RefreshCw, ArrowLeft, Wind } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { TeamBoard } from "@/components/TeamBoard";
import { useConfirm } from "@/components/AppModal";
import pkg from "../../package.json";

const GUIDE_ITEMS = [
  {
    title: "Dwell Daily",
    desc: "5–10 minutes of daily meditation is far more effective than long, weekly sessions.",
  },
  {
    title: "Abide in Parts",
    desc: "Memorise small sections that flow naturally before connecting them into a whole chapter.",
  },
  {
    title: "Attend & Reveal",
    desc: "Read first for rhythm, then gradually hide words to strengthen your inner voice.",
  },
  {
    title: "Speak the Word",
    desc: "Saying verses aloud or typing them from memory roots the word deeply in your soul.",
  },
  {
    title: "Embrace the Gaps",
    desc: "Mistakes are not failures; they are the markers that show you where to focus your practice.",
  },
  {
    title: "Space your Recall",
    desc: "Let the word rest. Returning to a passage tomorrow is when lasting memory is truly built.",
  },
  {
    title: "Flow over Perfection",
    desc: "Once the rhythm feels natural, move forward. Trust the process to refine your progress.",
  },
];

export default function Home() {
  const { state, setState, isHydrated, deleteChapter } = useBCM();
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [showInfo, setShowInfo] = useState(false);
  const isAdmin = true; // If not logged in (local mode), user is their own admin

  if (!isHydrated) return null;

  const chapters = Object.values(state.chapters).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  const selectedChapter = state.selectedChapterId ? state.chapters[state.selectedChapterId] : null;
  const memorisedCount = selectedChapter ? Object.values(state.cards[selectedChapter.id] || {}).filter(c => c.isMemorised).length : 0;
  const totalChunks = selectedChapter?.chunks.length || 0;
  const isChapterComplete = totalChunks > 0 && memorisedCount === totalChunks;

  const memorisedChapters = chapters.filter(ch => {
    const cards = state.cards[ch.id] || {};
    const count = Object.values(cards).filter(c => c.isMemorised).length;
    return ch.chunks.length > 0 && count === ch.chunks.length;
  });

  const handleSwitch = (id: string) => {
    setState(prev => ({ ...prev, selectedChapterId: id }));
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: "Delete Chapter",
      message: "Do you really want to delete this chapter and all its progress? This action cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    deleteChapter(id);
  };

  return (
    <div className="space-y-8 py-4">
      <ConfirmDialog />
      <header className="flex justify-between items-center relative">
        <Link 
          href="/chapter" 
          className="p-2.5 text-zinc-500 bg-[var(--surface)] rounded-full border border-[var(--surface-border)]" 
          aria-label="Back to chapter"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-lg font-bold uppercase tracking-widest absolute left-1/2 -translate-x-1/2">LIBRARY</h1>
        <div className="flex gap-2">
          <Link 
            href="/group"
            className={`p-2.5 transition-colors rounded-full border border-[var(--surface-border)] ${user ? "text-orange-500 bg-orange-500/10" : "text-[var(--theme-ui-subtext)] bg-[var(--surface)]"}`}
          >
            <Users size={22} />
          </Link>
          <button 
            onClick={() => setShowInfo(true)}
            className="p-2.5 text-[var(--theme-ui-subtext)] hover:text-white transition-colors bg-[var(--surface)] rounded-full border border-[var(--surface-border)]"
          >
            <Info size={22} />
          </button>
        </div>
      </header>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowInfo(false)} />
          <div className="relative w-full max-w-md bg-[var(--overlay-surface)] glass border border-[var(--surface-border)] rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold pr-8 leading-tight">How to Memorise a Chapter</h2>
              <button onClick={() => setShowInfo(false)} className="p-1 text-[var(--theme-ui-subtext)] hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              {GUIDE_ITEMS.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-[10px] font-black border border-orange-500/20">
                      {i + 1}
                    </div>
                    <h3 className="text-base font-bold text-white leading-tight">{item.title}</h3>
                  </div>
                  <p className="text-sm text-[var(--theme-ui-subtext)] leading-relaxed pl-9">{item.desc}</p>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowInfo(false)}
              className="w-full mt-10 py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-transform"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {chapters.length > 0 ? (
        <div className="space-y-8">
          {selectedChapter && (
            <div className="bg-[var(--surface)] glass border border-[var(--surface-border)] rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className="text-[var(--theme-ui-subtext)] text-sm font-medium uppercase tracking-wider">Active Chapter</h2>
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-bold">{selectedChapter.bookName} {selectedChapter.title}</p>
                    {isChapterComplete && (
                      <Trophy size={20} className="text-amber-400 fill-amber-400/20 animate-in zoom-in duration-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium pt-1">
                    <Award size={14} />
                    <span>
                      {state.versions[selectedChapter.versionId]?.abbreviation || selectedChapter.versionId} • {memorisedCount} / {totalChunks} Chunks
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link href="/chapter" className="flex items-center justify-center gap-2 py-4 bg-orange-500 text-white font-bold rounded-xl active:scale-95 transition-transform">
                  <BookOpen size={20} />Read Chapter
                </Link>
                <Link href="/review" className="flex items-center justify-center gap-2 py-4 bg-[var(--surface-alt)] text-white font-bold rounded-xl active:scale-95 transition-transform border border-[var(--surface-border)]">
                  <Award size={20} />My Progress
                </Link>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[var(--theme-ui-subtext)] uppercase tracking-wider px-1">Library</h3>
            <div className="grid gap-3">
              {chapters.map((ch) => (
                <div 
                  key={ch.id}
                  onClick={() => handleSwitch(ch.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all active:scale-[0.98] ${
                    selectedChapter && ch.id === selectedChapter.id 
                      ? "bg-white/5 border-white/20" 
                      : "bg-[var(--surface)] border-[var(--surface-border)] active:bg-[var(--surface-alt)]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                      selectedChapter && ch.id === selectedChapter.id ? "bg-white/10 border-white/30 text-white" : "bg-[var(--surface-alt)] border-[var(--surface-border)] text-white"
                    }`}>
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <p className={`font-bold ${selectedChapter && ch.id === selectedChapter.id ? "text-white" : "text-white"}`}>
                        {ch.bookName} {ch.title}
                        {selectedChapter && ch.id === selectedChapter.id && (
                          <span className="ml-2 text-[10px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-md tracking-tighter">ACTIVE</span>
                        )}
                      </p>
                      <p className={`text-[10px] uppercase tracking-widest font-bold ${selectedChapter && ch.id === selectedChapter.id ? "text-white/60" : "text-white/70"}`}>
                        {state.versions[ch.versionId]?.abbreviation || ch.versionId} • {Object.values(state.cards[ch.id] || {}).filter(c => c.isMemorised).length} / {ch.chunks.length} Memorised
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <button onClick={(e) => handleDelete(ch.id, e)} className={`p-2 transition-colors ${selectedChapter && ch.id === selectedChapter.id ? "text-white/60 hover:text-red-500" : "text-white/70 hover:text-red-500"}`}>
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isAdmin && (
                <Link
                  href="/import"
                  className="flex items-center justify-center gap-3 p-4 bg-[var(--surface)] border border-dashed border-[var(--surface-border)] rounded-xl text-[var(--theme-ui-subtext)] hover:text-orange-500 hover:border-orange-500/50 transition-all"
                >
                  <Upload size={20} />
                  <span className="font-bold">Add New Chapter</span>
                </Link>
              )}
            </div>
          </div>

          {memorisedChapters.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-amber-500 uppercase tracking-wider px-1 flex items-center gap-2">
                <Trophy size={14} />
                Memorised Chapters
              </h3>
              <div className="grid gap-3">
                {memorisedChapters.map((ch) => (
                  <div 
                    key={ch.id}
                    onClick={() => handleSwitch(ch.id)}
                    className="flex items-center justify-between p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 active:bg-amber-500/10 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-amber-500/30 bg-amber-500/10 text-amber-500">
                        <Trophy size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-amber-400">{ch.bookName} {ch.title}</p>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-amber-400/60">
                          {state.versions[ch.versionId]?.abbreviation || ch.versionId}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
          <div className="w-20 h-20 bg-[var(--surface)] rounded-3xl flex items-center justify-center border border-[var(--surface-border)] shadow-inner">
            <BookOpen size={40} className="text-[var(--theme-ui-subtext)]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Your Library is Empty</h2>
            <p className="text-[var(--theme-ui-subtext)] max-w-[240px] mx-auto">
              {isAdmin 
                ? "Import your first Bible chapter to begin." 
                : "Waiting for group administrator to add chapters."}
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/import"
              className="px-8 py-4 bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-transform"
            >
              Import Chapter
            </Link>
          )}
        </div>
      )}

      <p className="text-center text-[10px] text-[var(--theme-ui-subtext)] opacity-40 pt-8 pb-4">
        v{pkg.version}
      </p>
    </div>
  );
}
