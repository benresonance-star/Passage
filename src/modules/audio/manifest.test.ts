import { describe, expect, it } from "vitest";
import type { Chapter } from "@/types";
import { getChunkAudioRefs, hydrateChapterAudio } from "./manifest";

const baseChapter: Chapter = {
  id: "niv-romans-romans-8",
  bookName: "Romans",
  versionId: "niv",
  title: "Romans 8",
  fullText: "Romans 8",
  createdAt: new Date().toISOString(),
  verses: [
    { number: 1, text: "Verse one", type: "scripture" },
    { number: 2, text: "Verse two", type: "scripture" },
    { number: 3, text: "Verse three", type: "scripture" },
    { number: 4, text: "Verse four", type: "scripture" },
  ],
  chunks: [
    {
      id: "niv-romans-romans-8-v1-4",
      verseRange: "1-4",
      verses: [
        { number: 1, text: "Verse one", type: "scripture" },
        { number: 2, text: "Verse two", type: "scripture" },
        { number: 3, text: "Verse three", type: "scripture" },
        { number: 4, text: "Verse four", type: "scripture" },
      ],
      text: "Verse one Verse two Verse three Verse four",
    },
  ],
};

function makeChapter(overrides: Partial<Chapter>): Chapter {
  return {
    ...baseChapter,
    ...overrides,
    chunks: overrides.chunks ?? baseChapter.chunks,
    verses: overrides.verses ?? baseChapter.verses,
  };
}

describe("audio manifest", () => {
  it("returns chunk audio refs for mapped chunks", () => {
    const tracks = getChunkAudioRefs("niv-romans-romans-8", "niv-romans-romans-8-v1-4");

    expect(tracks).toHaveLength(1);
    expect(tracks[0].storageKey).toContain("No Condemnation.mp3");
  });

  it("hydrates chapter chunks with mapped audio metadata", () => {
    const hydratedChapter = hydrateChapterAudio(baseChapter);

    expect(hydratedChapter.chunks[0].audio).toHaveLength(1);
    expect(hydratedChapter.chunks[0].audio?.[0].title).toBe("No Condemnation");
  });

  it("hydrates library-import style Romans ids", () => {
    const hydratedChapter = hydrateChapterAudio(
      makeChapter({
        id: "niv-romans-8",
        title: "8",
        fullText: "Romans 8",
        chunks: [
          {
            ...baseChapter.chunks[0],
            id: "niv-romans-8-v1-4",
          },
        ],
      }),
    );

    expect(hydratedChapter.chunks[0].audio?.[0].title).toBe("No Condemnation");
  });

  it("hydrates migrated title-only ids using metadata and verse range", () => {
    const hydratedChapter = hydrateChapterAudio(
      makeChapter({
        id: "8",
        title: "8",
        fullText: "Romans 8",
        chunks: [
          {
            ...baseChapter.chunks[0],
            id: "8-v1-4",
          },
        ],
      }),
    );

    expect(hydratedChapter.chunks[0].audio?.[0].storageKey).toContain(
      "No Condemnation.mp3",
    );
  });

  it("preserves explicit chunk audio when one is already stored", () => {
    const explicitTrack = {
      id: "custom-track",
      title: "Custom",
      storageKey: "https://cdn.example.com/custom.mp3",
    };

    const hydratedChapter = hydrateChapterAudio({
      ...baseChapter,
      chunks: [
        {
          ...baseChapter.chunks[0],
          audio: [explicitTrack],
        },
      ],
    });

    expect(hydratedChapter.chunks[0].audio).toEqual([explicitTrack]);
  });
});
