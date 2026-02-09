"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronRight, Book, Hash, List, Loader2 } from "lucide-react";

interface LibrarySelectorProps {
  onSelect: (text: string) => void;
}

type Step = "book" | "chapter" | "verse";

export default function LibrarySelector({ onSelect }: LibrarySelectorProps) {
  const [step, setStep] = useState<Step>("book");
  const [books, setBooks] = useState<string[]>([]);
  const [chapters, setChapters] = useState<number[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bible_library")
      .select("book_name")
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

  const fetchChapters = async (book: string) => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bible_library")
      .select("chapter_number")
      .eq("book_name", book)
      .order("chapter_number");
    
    if (data) {
      const uniqueChapters = Array.from(new Set(data.map((c) => c.chapter_number)));
      setChapters(uniqueChapters);
    }
    setLoading(false);
  };

  const handleImport = async (book: string, chapter: number) => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bible_library")
      .select("*")
      .eq("book_name", book)
      .eq("chapter_number", chapter)
      .order("created_at", { ascending: true }); // Order by creation time to preserve sequence

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
      onSelect(fullText);
    }
    setLoading(false);
  };

  if (loading && books.length === 0) {
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
          onClick={() => { setStep("book"); setSelectedBook(null); }}
          className={step === "book" ? "text-orange-500" : "hover:text-zinc-300"}
        >
          Books
        </button>
        {selectedBook && (
          <>
            <ChevronRight size={12} />
            <button 
              onClick={() => { setStep("chapter"); setSelectedChapter(null); }}
              className={step === "chapter" ? "text-orange-500" : "hover:text-zinc-300"}
            >
              {selectedBook}
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {step === "book" && books.map((book) => (
          <button
            key={book}
            onClick={() => {
              setSelectedBook(book);
              fetchChapters(book);
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
                onClick={() => handleImport(selectedBook!, chapter)}
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

