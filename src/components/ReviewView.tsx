"use client";

import { Verse, Chunk } from "@/types";
import { Check, Edit2, ArrowRight, Book, Hash, Layers } from "lucide-react";

interface ReviewViewProps {
  title: string;
  bookName: string;
  versionId: string;
  verses: Verse[];
  chunks: Chunk[];
  onConfirm: () => void;
  onBack: () => void;
  onEditMetadata: (title: string, book: string, version: string) => void;
}

export default function ReviewView({
  title,
  bookName,
  versionId,
  verses,
  chunks,
  onConfirm,
  onBack,
  onEditMetadata,
}: ReviewViewProps) {
  const scriptureCount = verses.filter((v) => v.type === "scripture").length;

  return (
    <div className="space-y-6">
      <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--surface-border)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Review Passage</h2>
          <button
            onClick={() => {
              const newTitle = prompt("Enter Title (e.g. 8 or 3:1-17)", title);
              const newBook = prompt("Enter Book Name (e.g. Romans)", bookName);
              const newVersion = prompt("Enter Version (e.g. niv)", versionId);
              if (newTitle !== null && newBook !== null && newVersion !== null) {
                onEditMetadata(newTitle, newBook, newVersion);
              }
            }}
            className="p-2 text-zinc-400 hover:text-orange-500 transition-colors"
          >
            <Edit2 size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-3 text-zinc-300">
            <Book size={18} className="text-orange-500" />
            <span className="font-medium">{bookName} {title}</span>
            <span className="text-xs bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full uppercase font-bold">
              {versionId}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <Hash size={16} />
              <span>{scriptureCount} Verses</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers size={16} />
              <span>{chunks.length} Chunks</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-400 px-1">Parsed Content Preview</h3>
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--surface-border)] overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700">
            {verses.map((v, i) => (
              <div key={i} className={`text-sm ${v.type === "heading" ? "text-orange-500 font-bold mt-4 first:mt-0" : "text-zinc-300"}`}>
                {v.type === "scripture" && (
                  <span className="text-[10px] text-orange-500/50 font-mono mr-2 align-top">
                    {v.number}
                  </span>
                )}
                {v.text.replace(/\[LINEBREAK\]/g, " ").replace(/\[PARAGRAPH\]/g, "")}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-colors"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          className="flex-[2] py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/10"
        >
          <Check size={20} />
          Confirm & Save
        </button>
      </div>
    </div>
  );
}
