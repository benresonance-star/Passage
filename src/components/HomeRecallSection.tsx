"use client";

import { useBCM } from "@/context/BCMContext";
import { useAuth } from "@/context/AuthContext";
import { getLearnNextSection, getRecallDueStatus } from "@/lib/scheduler";
import { Play, Wind, CheckCircle2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function HomeRecallSection() {
  const { state, setState } = useBCM();
  const { user } = useAuth();
  const router = useRouter();

  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;
  
  if (!chapter || !chapterId) return null;

  const nextSection = getLearnNextSection(chapterId, state);
  const { isDue, nextDueAt } = getRecallDueStatus(chapterId, state);
  
  const memorisedCount = Object.values(state.cards[chapterId] || {}).filter(c => c.isMemorised).length;
  const hasMemorised = memorisedCount > 0;

  const handleLearnNext = () => {
    if (!nextSection) return;
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        activeChunkId: { ...prev.settings.activeChunkId, [chapterId]: nextSection.id }
      }
    }));
    router.push("/study");
  };

  const handleRecall = () => {
    // For recall, we target the first memorised section that is due
    // or just the first memorised section if we want to "recite through"
    const memorisedSections = Object.values(state.cards[chapterId] || {})
      .filter(c => c.isMemorised)
      .sort((a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime());
    
    if (memorisedSections.length === 0) return;

    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        activeChunkId: { ...prev.settings.activeChunkId, [chapterId]: memorisedSections[0].id }
      }
    }));
    // Navigate to study page with recallAll flag
    router.push("/study?mode=recall&recallAll=true");
  };

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Friend";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="px-1">
        <h2 className="text-2xl font-bold">Hello, {displayName}</h2>
        <p className="text-[var(--theme-ui-subtext)] text-sm">Ready to dwell in the Word today?</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {hasMemorised && (
          <button
            onClick={handleRecall}
            disabled={!isDue}
            className={`flex items-center justify-between p-6 rounded-[24px] border transition-all active:scale-[0.98] ${
              isDue 
                ? "bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-500/20" 
                : "bg-[var(--surface)] border-[var(--surface-border)] opacity-60 grayscale cursor-not-allowed"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDue ? "bg-white/20" : "bg-[var(--surface-alt)]"}`}>
                <Clock size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-lg">Recall</p>
                <p className="text-xs opacity-80">
                  {isDue ? "Time to recite your memorised sections" : "Consolidating memory..."}
                </p>
              </div>
            </div>
            {isDue && <Play size={20} fill="currentColor" />}
          </button>
        )}

        <button
          onClick={handleLearnNext}
          disabled={!nextSection}
          className="flex items-center justify-between p-6 bg-[var(--surface)] glass border border-[var(--surface-border)] rounded-[24px] text-white shadow-xl active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 border border-orange-500/20">
              <Wind size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold text-lg">Learn Next</p>
              <p className="text-xs text-[var(--theme-ui-subtext)]">
                {nextSection 
                  ? `Start learning ${state.settings.studyUnit || "chunk"} ${nextSection.verseRange}`
                  : "Chapter fully memorised!"}
              </p>
            </div>
          </div>
          {nextSection && <Play size={20} className="text-orange-500" fill="currentColor" />}
        </button>
      </div>
    </motion.div>
  );
}
