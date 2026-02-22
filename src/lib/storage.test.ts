import { describe, it, expect, beforeEach, vi } from "vitest";

let store: Record<string, string> = {};

vi.stubGlobal("window", {
  ...globalThis,
  localStorage: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  },
});

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { store = {}; },
});

const { loadState, saveState, INITIAL_STATE } = await import("./storage");

describe("storage", () => {
  beforeEach(() => {
    store = {};
  });

  it("seeds with Romans 8 when no data exists", () => {
    const state = loadState();
    const chapterIds = Object.keys(state.chapters);
    expect(chapterIds.length).toBeGreaterThan(0);
    const firstChapter = state.chapters[chapterIds[0]];
    expect(firstChapter.title).toContain("Romans");
  });

  it("round-trips state through save/load", () => {
    saveState(INITIAL_STATE);
    const loaded = loadState();
    expect(loaded.settings.clozeLevel).toBe(INITIAL_STATE.settings.clozeLevel);
  });

  it("migrates v1 single-chapter format to v2 multi-chapter", () => {
    const v1Data = {
      chapter: {
        id: "old-id",
        title: "Romans 8",
        fullText: "<1> Verse one",
        verses: [{ number: 1, text: "Verse one", type: "scripture" }],
        chunks: [],
        createdAt: new Date().toISOString(),
      },
      cards: {},
      stats: { streak: 0, lastActivity: null },
      settings: { activeChunkId: null },
    };
    store["bcm_v1_state"] = JSON.stringify(v1Data);

    const state = loadState();
    expect(state.chapters).toBeDefined();
    expect(Object.keys(state.chapters).length).toBe(1);
    expect(state.selectedChapterId).not.toBeNull();
  });

  it("returns INITIAL_STATE on corrupted JSON", () => {
    store["bcm_v1_state"] = "not-json!";
    const state = loadState();
    expect(state).toEqual(INITIAL_STATE);
  });
});
