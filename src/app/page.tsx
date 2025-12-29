"use client";

import { useState } from "react";
import Link from "next/link";
import { useBCM } from "@/context/BCMContext";
import { Play, BookOpen, Upload, ChevronRight, Award, Trash2, Trophy, Info, X, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { TeamBoard } from "@/components/TeamBoard";

const GUIDE_ITEMS = [
  {
    title: "Use short, daily sessions.",
    desc: "5–10 minutes every day beats long sessions once a week.",
  },
  {
    title: "Learn in chunks, not verses alone.",
    desc: "Memorise small sections that flow together, then connect them.",
  },
  {
    title: "Read → hide → recall.",
    desc: "First read for rhythm, then fill in blanks, then recall from memory.",
  },
  {
    title: "Type or say it out loud.",
    desc: "Forcing recall strengthens memory far more than rereading.",
  },
  {
    title: "Expect mistakes — they’re the work.",
    desc: "The app saves missed lines so you practise what matters most.",
  },
  {
    title: "Return tomorrow, not immediately.",
    desc: "Spacing your recall is what makes it stick long-term.",
  },
  {
    title: "Aim for flow, not perfection.",
    desc: "Once you can say it smoothly, move on and let review do its job.",
  },
];

export default function Home() {
  const { state, setState, isHydrated } = useBCM();
  const { user } = useAuth();
  const [showInfo, setShowInfo] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchGroup = async () => {
        try {
          const { data, error } = await supabase
            .from('group_members')
            .select('group_id, role, groups(name, admin_id)')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();
          
          if (error) throw error;
          if (data) {
            setGroupId(data.group_id);
            setGroupName((data.groups as any)?.name || null);
            setIsAdmin(data.role === 'admin' || (data.groups as any)?.admin_id === user.id);
          }
        } catch (err) {
          console.error("Home group fetch error:", err);
        }
      };
      fetchGroup();
    } else {
      setIsAdmin(true); // If not logged in (local mode), user is their own admin
    }
  }, [user]);

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

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("⚠️ CAUTION: Do you really want to delete this chapter and all its progress? This action cannot be undone.")) return;
    
    setState(prev => {
      const { [id]: _, ...remainingChapters } = prev.chapters;
      const { [id]: __, ...remainingCards } = prev.cards;
      const { [id]: ___, ...remainingStats } = prev.stats;
      const { [id]: ____, ...remainingActiveChunks } = prev.settings.activeChunkId;
      
      return {
        ...prev,
        chapters: remainingChapters,
        selectedChapterId: prev.selectedChapterId === id ? (Object.keys(remainingChapters)[0] || null) : prev.selectedChapterId,
        cards: remainingCards,
        stats: remainingStats,
        settings: {
          ...prev.settings,
          activeChunkId: remainingActiveChunks
        }
      };
    });
  };

  return (
    <div className="space-y-8 py-6">
      <header className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <BookOpen size={52} className="text-orange-500" />
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-[0.05em]">Passage</h1>
            <p className="text-zinc-500">Bible Chapter Memoriser</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link 
            href="/group"
            className={`p-2 transition-colors rounded-full border border-white/5 ${user ? "text-orange-500 bg-orange-500/10" : "text-zinc-500 bg-zinc-900"}`}
          >
            <Users size={20} />
          </Link>
          <button 
            onClick={() => setShowInfo(true)}
            className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-900 rounded-full border border-white/5"
          >
            <Info size={20} />
          </button>
        </div>
      </header>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowInfo(false)} />
          <div className="absolute inset-x-0 bottom-0 max-w-md mx-auto bg-zinc-900 border-t border-zinc-800 rounded-t-[32px] p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-lg font-bold pr-8">How to Memorise a Chapter (the right way)</h2>
              <button onClick={() => setShowInfo(false)} className="p-1 text-zinc-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-5">
              {GUIDE_ITEMS.map((item, i) => (
                <div key={i} className="space-y-0.5">
                  <h3 className="text-base font-bold text-white leading-tight">{item.title}</h3>
                  <p className="text-sm text-zinc-400 leading-normal">{item.desc}</p>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowInfo(false)}
              className="w-full mt-8 py-3.5 bg-zinc-800 text-white font-bold rounded-2xl border border-white/5 active:scale-95 transition-transform"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {selectedChapter ? (
        <div className="space-y-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Active Chapter</h2>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-bold">{selectedChapter.title}</p>
                  {isChapterComplete && (
                    <Trophy size={20} className="text-amber-400 fill-amber-400/20 animate-in zoom-in duration-500" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium pt-1">
                  <Award size={14} />
                  <span>
                    {memorisedCount} / {totalChunks} Chunks
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link href="/practice" className="flex items-center justify-center gap-2 py-4 bg-orange-500 text-white font-bold rounded-xl active:scale-95 transition-transform">
                <Play size={20} fill="currentColor" />Practice
              </Link>
              <Link href="/chapter" className="flex items-center justify-center gap-2 py-4 bg-zinc-800 text-white font-bold rounded-xl active:scale-95 transition-transform">
                <BookOpen size={20} />Full Text
              </Link>
            </div>
          </div>

          {groupId && selectedChapter && (
            <TeamBoard 
              groupId={groupId} 
              groupName={groupName || "Group"}
              chapterTitle={selectedChapter.title} 
              totalChunks={selectedChapter.chunks.length} 
            />
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider px-1">Library</h3>
            <div className="grid gap-3">
              {chapters.map((ch) => (
                <div 
                  key={ch.id}
                  onClick={() => handleSwitch(ch.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all active:scale-[0.98] ${
                    ch.id === selectedChapter.id 
                      ? "bg-orange-500/5 border-orange-500/20" 
                      : "bg-zinc-900 border-zinc-800 active:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                      ch.id === selectedChapter.id ? "bg-orange-500/10 border-orange-500/30 text-orange-500" : "bg-zinc-800 border-zinc-700 text-zinc-500"
                    }`}>
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <p className={`font-bold ${ch.id === selectedChapter.id ? "text-orange-500" : "text-white"}`}>{ch.title}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        {Object.values(state.cards[ch.id] || {}).filter(c => c.isMemorised).length} / {ch.chunks.length} Memorised
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={(e) => handleDelete(ch.id, e)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
              {isAdmin && (
                <Link
                  href="/import"
                  className="flex items-center justify-center gap-3 p-4 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:text-orange-500 hover:border-orange-500/50 transition-all"
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
                        <p className="font-bold text-amber-400">{ch.title}</p>
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
          <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800 shadow-inner">
            <BookOpen size={40} className="text-zinc-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Your Library is Empty</h2>
            <p className="text-zinc-500 max-w-[240px] mx-auto">
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
    </div>
  );
}
