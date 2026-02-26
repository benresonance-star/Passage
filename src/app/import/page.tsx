"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBCM } from "@/context/BCMContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { parseChapter, chunkVerses, getChapterSlug } from "@/lib/parser";
import { SM2Card, Chapter, BibleVersion, Verse, Chunk } from "@/types";
import { ArrowLeft, Save, AlertTriangle, Check, BookOpen, Type, ChevronDown, Eye, Globe } from "lucide-react";
import Link from "next/link";
import LibrarySelector from "@/components/LibrarySelector";
import ReviewView from "@/components/ReviewView";
import { useConfirm, useToast } from "@/components/AppModal";
import { useEffect } from "react";

export default function ImportPage() {
  const [text, setText] = useState("");
  const [stripRefs, setStripRefs] = useState(true);
  const [mode, setMode] = useState<"library" | "paste">("library");
  const [step, setStep] = useState<"input" | "review">("input");
  const [versionId, setVersionId] = useState("niv");
  const [bookName, setBookName] = useState("");
  const [pushToGlobal, setPushToGlobal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [parsedData, setParsedData] = useState<{
    title: string;
    bookName: string;
    versionId: string;
    verses: Verse[];
    chunks: Chunk[];
  } | null>(null);

  const { state, setState, pushChapter } = useBCM();
  const { user } = useAuth();
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const { toast, ToastContainer } = useToast();

  useEffect(() => {
    if (user && supabase) {
      const client = supabase; // Narrow for closures
      const fetchAdminStatus = async () => {
        const { data } = await client
          .from('group_members')
          .select('role, groups(admin_id)')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        if (data) {
          const groups = data.groups as { admin_id?: string } | null;
          setIsAdmin(data.role === 'admin' || groups?.admin_id === user.id);
        } else {
          setIsAdmin(false);
        }
      };
      fetchAdminStatus();
    } else {
      setIsAdmin(true); // Local mode
    }
  }, [user]);

  const handleReview = () => {
    if (!text.trim()) return;

    const { title, verses, bookName: parsedBook, versionId: parsedVersion } = parseChapter(text, stripRefs);
    
    // Use parsed values if they exist, otherwise use state values
    const finalBook = parsedBook || bookName || "My Book";
    const finalVersion = parsedVersion || versionId;
    const finalTitle = title || "My Chapter";

    const chunks = chunkVerses(verses, finalTitle, 4, finalBook, finalVersion);

    setParsedData({
      title: finalTitle,
      bookName: finalBook,
      versionId: finalVersion,
      verses,
      chunks,
    });
    setStep("review");
  };

  const pushToGlobalLibrary = async (title: string, book: string, version: string, verses: Verse[]) => {
    if (!supabase) {
      console.error("Supabase client not initialized");
      return;
    }

    // Extract chapter number from title (e.g. "3:1-17" -> 3, "8" -> 8)
    const chapterMatch = title.match(/^(\d+)/);
    const chapterNumber = chapterMatch ? parseInt(chapterMatch[1]) : 1;

    console.log("Preparing global library push", {
      title,
      book,
      version,
      chapterNumber,
      verseCount: verses.length
    });

    const rows = verses.map((v) => ({
      version_id: version.toLowerCase().trim(),
      book_name: book.trim(),
      chapter_number: chapterNumber,
      verse_number: v.type === "scripture" ? v.number : null,
      content: v.type === "scripture" ? v.text.replace(/\[LINEBREAK\]/g, " ").replace(/\[PARAGRAPH\]/g, "").trim() : null,
      is_heading: v.type === "heading",
      heading_text: v.type === "heading" ? v.text.replace(/\[LINEBREAK\]/g, " ").replace(/\[PARAGRAPH\]/g, "").trim() : null,
      created_at: new Date().toISOString(),
    }));

    try {
      const { error } = await supabase.from("bible_library").insert(rows);
      if (error) {
        console.error("Supabase error pushing to global library:", error);
        toast(`Upload Failed: ${error.message} (Code: ${error.code})`, "error");
      } else {
        console.log("Successfully pushed to global library:", { book, title, rowCount: rows.length });
        toast(`${book} ${title} added to global library.`, "success");
      }
    } catch (err) {
      console.error("Unexpected error during global library push:", err);
      toast(`Upload Error: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    }
  };

  const handleImport = async (importText?: string, importBook?: string, importVersion?: string) => {
    console.log("handleImport triggered", { step, pushToGlobal, isAdmin, hasParsedData: !!parsedData });
    let finalTitle: string;
    let finalVerses: Verse[];
    let finalBook: string;
    let finalVersion: string;
    let finalChunks: Chunk[];

    if (parsedData && step === "review") {
      finalTitle = parsedData.title;
      finalVerses = parsedData.verses;
      finalBook = parsedData.bookName;
      finalVersion = parsedData.versionId;
      finalChunks = parsedData.chunks;
    } else {
      const finalLines = importText || text;
      if (!finalLines.trim()) return;

      finalBook = importBook || bookName || "My Book";
      finalVersion = importVersion || versionId;

      const { title, verses } = parseChapter(finalLines, stripRefs);
      finalTitle = title;
      finalVerses = verses;
      finalChunks = chunkVerses(finalVerses, finalTitle, 4, finalBook, finalVersion);
    }

    const chapterId = getChapterSlug(finalTitle, finalBook, finalVersion);

    // Check for duplicates
    if (state.chapters[chapterId]) {
      const shouldOverwrite = await confirm({
        title: "Duplicate Chapter",
        message: `"${finalTitle}" is already in your library. Do you want to overwrite it?`,
        confirmLabel: "Overwrite",
        destructive: true,
      });

      if (!shouldOverwrite) return;
    }

    const initialCards: Record<string, SM2Card> = {};
    const now = new Date().toISOString();

    finalChunks.forEach((chunk) => {
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
      title: finalTitle,
      fullText: importText || text,
      verses: finalVerses,
      chunks: finalChunks,
      createdAt: now,
    };

    // Global Library Sync (Admin Only) - Do this BEFORE redirecting
    if (pushToGlobal && isAdmin) {
      console.log("Pushing to global library...");
      await pushToGlobalLibrary(finalTitle, finalBook, finalVersion, finalVerses);
    }

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
          [chapterId]: finalChunks[0]?.id || null,
        },
      },
    }));

    // Cloud Sync
    await pushChapter(newChapter);

    router.push("/chapter");
  };

  const versions = Object.values(state.versions);

  return (
    <div className="space-y-6 pb-[calc(64px+env(safe-area-inset-bottom)+2rem)] pt-safe px-4">
      <header className="flex items-center gap-4 py-4 px-1">
        <Link href="/chapter" className="text-zinc-400">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl">{step === "review" ? "Review Passage" : "Add Passage"}</h1>
        {isAdmin && user && (
          <span className="text-[10px] font-bold bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full border border-orange-500/20 uppercase tracking-widest">
            Admin
          </span>
        )}
      </header>

      {step === "review" && parsedData ? (
        <ReviewView
          {...parsedData}
          onConfirm={() => handleImport()}
          onBack={() => setStep("input")}
          onEditMetadata={(title, book, version) => {
            setParsedData((prev) =>
              prev ? { ...prev, title, bookName: book, versionId: version } : null
            );
          }}
        />
      ) : (
        <>
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
                    {"Colossians 3:1-17 (NIV)\nLiving as Those Made Alive...\n\n3 Since, then..."}
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

                {isAdmin && (
                  <div 
                    onClick={() => setPushToGlobal(!pushToGlobal)}
                    className="flex items-center gap-3 p-4 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl cursor-pointer active:bg-[var(--surface-alt)] transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      pushToGlobal ? "bg-orange-500 border-orange-500" : "border-[var(--surface-border)]"
                    }`}>
                      {pushToGlobal && <Globe size={14} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm text-zinc-300 block">Push to Global Library</span>
                      <span className="text-[10px] text-zinc-500 uppercase">Admin Only</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleReview()}
                  disabled={!text.trim()}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/10"
                >
                  <Eye size={20} />
                  Review Passage
                </button>
              </>
            )}
          </div>
        </>
      )}
      <ConfirmDialog />
      <ToastContainer />
    </div>
  );
}
