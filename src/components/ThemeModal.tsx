"use client";

import { X } from "lucide-react";

const THEME_PRESETS = [
  { name: "OLED", bg: "#000000", text: "#f4f4f5" },
  { name: "Midnight", bg: "#0f172a", text: "#e2e8f0" },
  { name: "Sepia", bg: "#fdf6e3", text: "#433422" },
  { name: "Night Dusk", bg: "#1a1816", text: "#f2e8d5", id: "night-dusk" },
  { name: "Classic", bg: "#18181b", text: "#d4d4d8" },
  { name: "Dawn", bg: "#3d3566", text: "#fffcf0", id: "dawn" },
];

interface ThemeModalProps {
  currentTheme: { bg: string; text: string; id?: string };
  onSetTheme: (bg: string, text: string, id?: string) => void;
  onClose: () => void;
  isSepia: boolean;
  isIPhone: boolean;
}

export function ThemeModal({ currentTheme, onSetTheme, onClose, isSepia, isIPhone }: ThemeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />
      <div
        className="relative w-full max-w-md bg-[var(--overlay-surface)] glass border border-[var(--surface-border)] rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-300"
        role="dialog"
        aria-label="Appearance settings"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className={`text-xl font-bold text-center w-full ml-8 ${isSepia ? "text-zinc-800" : "text-white"}`}>
            Appearance
          </h2>
          <button onClick={onClose} className="p-2 text-zinc-500" aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3">
            {THEME_PRESETS.map((p) => {
              const isSelected = p.id
                ? currentTheme.id === p.id
                : currentTheme.bg === p.bg && !currentTheme.id;
              return (
                <button
                  key={p.name}
                  onClick={() => onSetTheme(p.bg, p.text, p.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    isSelected ? "border-orange-500 bg-orange-500/5" : "border-[var(--surface-border)] bg-[var(--surface)]"
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full border border-white/10 shadow-inner flex-shrink-0"
                    style={
                      p.id === "dawn"
                        ? { background: "linear-gradient(180deg, #3d3566 0%, #dabb8e 50%, #5a8090 100%)" }
                        : p.id === "night-dusk"
                        ? { background: "linear-gradient(180deg, #1a1816 0%, #2d2a26 100%)", backgroundColor: "#1a1816" }
                        : { backgroundColor: p.bg }
                    }
                  />
                  <span className={`font-bold text-sm ${isSepia ? "text-zinc-800" : "text-white"}`}>{p.name}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-4 pt-4 border-t border-[var(--surface-border)]">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-bold ${isSepia ? "text-zinc-600" : "text-zinc-400"}`}>Background</span>
              <input
                type="color"
                value={currentTheme.bg}
                onChange={(e) => onSetTheme(e.target.value, currentTheme.text)}
                className={`w-12 h-12 rounded-lg bg-transparent cursor-pointer ${isIPhone ? "border-2 border-black" : ""}`}
                aria-label="Background color"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-bold ${isSepia ? "text-zinc-600" : "text-zinc-400"}`}>Text Color</span>
              <input
                type="color"
                value={currentTheme.text}
                onChange={(e) => onSetTheme(currentTheme.bg, e.target.value)}
                className={`w-12 h-12 rounded-lg bg-transparent cursor-pointer ${isIPhone ? "border-2 border-black" : ""}`}
                aria-label="Text color"
              />
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`w-full mt-12 py-4 bg-[var(--surface-alt)] font-bold rounded-2xl border border-[var(--surface-border)] active:scale-95 transition-transform ${isSepia ? "text-zinc-800" : "text-white"}`}
        >
          Done
        </button>
      </div>
    </div>
  );
}
