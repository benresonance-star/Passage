"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronRight, Book, Hash, List, Loader2, Globe } from "lucide-react";

interface LibrarySelectorProps {
  onSelect: (text: string, bookName: string, versionId: string) => void;
}

type Step = "version" | "book" | "chapter";

interface BibleVersion {
  id: string;
  name: string;
  abbreviation: string;
}

export default function LibrarySelector({ onSelect }: LibrarySelectorProps) {
  const [step, setStep] = useState<Step>("version");
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<string[]>([]);
  const [chapters, setChapters] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<BibleVersion | null>(null);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bible_versions")
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error fetching versions:", error);
    }
    
    if (data) {
      setVersions(data);
    }
    setLoading(false);
  };

  const fetchBooks = async (versionId: string) => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bible_library")
      .select("book_name")
      .eq("version_id", versionId)
      .order("book_name");
    
    if (error) {
      console.error("Error fetching books:", error);
    }
    
    if (data) {
      const uniqueBooks = Array.from(new Set(data.map((b) => b.book_name)));
      setBooks(uniqueBooks);
    }
    setLoading(false);
  };

  const fetchChapters = async (book: string, versionId: string) => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bible_library")
      .select("chapter_number")
      .eq("book_name", book)
      .eq("version_id", versionId)
      .order("chapter_number");
    
    if (data) {
      const uniqueChapters = Array.from(new Set(data.map((c) => c.chapter_number)));
      setChapters(uniqueChapters);
    }
    setLoading(false);
  };

  const handleImport = async (book: string, chapter: number, version: BibleVersion) => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bible_library")
      .select("*")
      .eq("book_name", book)
      .eq("chapter_number", chapter)
      .eq("version_id", version.id)
      .order("created_at", { ascending: true });

    if (data) {
      // Reconstruct the text format expected by parseChapter
      let fullText = `${book} ${chapter}\n\n`;
      data.forEach((row) => {
        if (row.is_heading) {
          fullText += `\n${row.heading_text}\n`;
        } else {
          fullText += `<${row.verse_number}> ${row.content} `;
        }
      });
      onSelect(fullText, book, version.id);
    }
    setLoading(false);
  };

  if (loading && versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Loading Library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
        <button 
          onClick={() => { setStep("version"); setSelectedVersion(null); setSelectedBook(null); }}
          className={step === "version" ? "text-orange-500" : "hover:text-zinc-300"}
        >
          Versions
        </button>
        {selectedVersion && (
          <>
            <ChevronRight size={12} />
            <button 
              onClick={() => { setStep("book"); setSelectedBook(null); }}
              className={step === "book" ? "text-orange-500" : "hover:text-zinc-300"}
            >
              {selectedVersion.abbreviation}
            </button>
          </>
        )}
        {selectedBook && (
          <>
            <ChevronRight size={12} />
            <button 
              onClick={() => { setStep("chapter"); }}
              className={step === "chapter" ? "text-orange-500" : "hover:text-zinc-300"}
            >
              {selectedBook}
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {step === "version" && versions.map((v) => (
          <button
            key={v.id}
            onClick={() => {
              setSelectedVersion(v);
              fetchBooks(v.id);
              setStep("book");
            }}
            className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl hover:bg-[var(--surface-alt)] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-orange-500" />
              <div>
                <span className="font-medium block">{v.abbreviation}</span>
                <span className="text-xs text-zinc-500">{v.name}</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-600" />
          </button>
        ))}

        {step === "book" && books.map((book) => (
          <button
            key={book}
            onClick={() => {
              setSelectedBook(book);
              fetchChapters(book, selectedVersion!.id);
              setStep("chapter");
            }}
            className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl hover:bg-[var(--surface-alt)] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Book size={18} className="text-orange-500" />
              <span className="font-medium">{book}</span>
            </div>
            <ChevronRight size={18} className="text-zinc-600" />
          </button>
        ))}

        {step === "chapter" && (
          <div className="grid grid-cols-4 gap-2">
            {chapters.map((chapter) => (
              <button
                key={chapter}
                onClick={() => handleImport(selectedBook!, chapter, selectedVersion!)}
                className="aspect-square flex flex-col items-center justify-center bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl hover:bg-[var(--surface-alt)] transition-colors"
              >
                <span className="text-lg font-bold">{chapter}</span>
                <span className="text-[10px] text-zinc-500 uppercase">Chapter</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-orange-500" size={24} />
        </div>
      )}
    </div>
  );
}

