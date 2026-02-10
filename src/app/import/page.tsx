"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBCM } from "@/context/BCMContext";
import { parseChapter, chunkVerses, getChapterSlug } from "@/lib/parser";
import { SM2Card, Chapter, BibleVersion } from "@/types";
import { ArrowLeft, Save, AlertTriangle, Check, BookOpen, Type, ChevronDown } from "lucide-react";
import Link from "next/link";
import LibrarySelector from "@/components/LibrarySelector";
import { useConfirm, useToast } from "@/components/AppModal";

export default function ImportPage() {
  const [text, setText] = useState("");
  const [stripRefs, setStripRefs] = useState(true);
  const [mode, setMode] = useState<"library" | "paste">("library");
  const [versionId, setVersionId] = useState("niv");
  const [bookName, setBookName] = useState("");
  const { state, setState, pushChapter } = useBCM();
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const { toast, ToastContainer } = useToast();

  const handleImport = async (importText?: string, importBook?: string, importVersion?: string) => {
    const finalLines = importText || text;
    if (!finalLines.trim()) return;

    const finalBook = importBook || bookName || "My Book";
    const finalVersion = importVersion || versionId;

    const { title, verses } = parseChapter(finalLines, stripRefs);
    const chapterId = getChapterSlug(title, finalBook, finalVersion);

    // Check for duplicates
    if (state.chapters[chapterId]) {
      const shouldOverwrite = await confirm({
        title: "Duplicate Chapter",
        message: `"${title}" is already in your library. Do you want to overwrite it?`,
        confirmLabel: "Overwrite",
        destructive: true,
      });

      if (!shouldOverwrite) return;
    }

    const chunks = chunkVerses(verses, title, 4, finalBook, finalVersion);
    const initialCards: Record<string, SM2Card> = {};
    const now = new Date().toISOString();

    chunks.forEach((chunk) => {
      initialCards[chunk.id] = {
        id: chunk.id,
        ease: 2.5,
        intervalDays: 0,
        reps: 0,
        lapses: 0,
        nextDueAt: now,
        lastScore: null,
        hardUntilAt: null,
        isMemorised: false,
      };
    });

    const newChapter: Chapter = {
      id: chapterId,
      versionId: finalVersion,
      bookName: finalBook,
      title,
      fullText: finalLines,
      verses,
      chunks,
      createdAt: now,
    };

    setState((prev) => ({
      ...prev,
      chapters: {
        ...prev.chapters,
        [chapterId]: newChapter,
      },
      selectedChapterId: chapterId,
      cards: {
        ...prev.cards,
        [chapterId]: initialCards,
      },
      stats: {
        ...prev.stats,
        [chapterId]: { streak: 0, lastActivity: null },
      },
      settings: {
        ...prev.settings,
        activeChunkId: {
          ...prev.settings.activeChunkId,
          [chapterId]: chunks[0]?.id || null,
        },
      },
    }));

    // Cloud Sync
    await pushChapter(newChapter);

    router.push("/chapter");
  };

  const hasMarkers = text.includes("<") && text.includes(">");

  const versions = Object.values(state.versions);

  return (
    <div className="space-y-6 pb-[calc(64px+env(safe-area-inset-bottom)+2rem)] pt-[env(safe-area-inset-top)] px-4">
      <header className="flex items-center gap-4 py-4 px-1">
        <Link href="/chapter" className="text-zinc-400">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl">Add Passage</h1>
      </header>

      {/* Mode Switcher */}
      <div className="flex p-1 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
        <button
          onClick={() => setMode("library")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            mode === "library" ? "bg-orange-500 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <BookOpen size={16} />
          Library
        </button>
        <button
          onClick={() => setMode("paste")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            mode === "paste" ? "bg-orange-500 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Type size={16} />
          Paste Text
        </button>
      </div>

      <div className="space-y-4">
        {mode === "library" ? (
          <LibrarySelector onSelect={(t, b, v) => handleImport(t, b, v)} />
        ) : (
          <>
            <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--surface-border)]">
              <p className="text-sm text-zinc-400 mb-2">Example format:</p>
              <pre className="text-xs text-orange-500/80 bg-[var(--input-bg)] p-2 rounded border border-orange-500/20 leading-relaxed">
                {"<1> Therefore, there is now no...\n<2> because through Christ..."}
              </pre>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Version</label>
                <div className="relative">
                  <select
                    value={versionId}
                    onChange={(e) => setVersionId(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl p-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.abbreviation}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Book Name</label>
                <input
                  type="text"
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  placeholder="e.g. Romans"
                  className="w-full bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Chapter Text</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-60 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                placeholder="Paste your chapter here..."
              />
            </div>

            <div 
              onClick={() => setStripRefs(!stripRefs)}
              className="flex items-center gap-3 p-4 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl cursor-pointer active:bg-[var(--surface-alt)] transition-colors"
            >
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                stripRefs ? "bg-orange-500 border-orange-500" : "border-[var(--surface-border)]"
              }`}>
                {stripRefs && <Check size={14} className="text-white" />}
              </div>
              <span className="text-sm text-zinc-300">Strip links & references</span>
            </div>

            {text.length > 0 && !hasMarkers && (
              <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-500 text-sm">
                <AlertTriangle size={16} />
                <p>No verse markers detected. Treated as one chunk.</p>
              </div>
            )}

            <button
              onClick={() => handleImport()}
              disabled={!text.trim() || !bookName.trim()}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/10"
            >
              <Save size={20} />
              Save to Library
            </button>
          </>
        )}
      </div>
      <ConfirmDialog />
      <ToastContainer />
    </div>
  );
}
