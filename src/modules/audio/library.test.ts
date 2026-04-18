import { describe, expect, it } from "vitest";
import { getDefaultBackingTracks, getTrackTypeLabel, mergeTrackLibraries } from "./library";

describe("audio library helpers", () => {
  it("returns the default instrumental study tracks", () => {
    expect(getDefaultBackingTracks().map((track) => track.title)).toEqual([
      "Presence",
      "Stillness",
    ]);
  });

  it("derives track type labels from storage paths", () => {
    expect(
      getTrackTypeLabel({
        storageKey: "music/Instrumental Study Tracks/Presence.mp3",
      }),
    ).toBe("Instrumental");

    expect(
      getTrackTypeLabel({
        storageKey: "music/Romans 8 Verses 1-4 NIV/No Condemnation.mp3",
      }),
    ).toBe("Vocals");

    expect(
      getTrackTypeLabel({
        storageKey: "other/path/file.mp3",
      }),
    ).toBe("Track");
  });

  it("merges default and chunk tracks without duplicate ids", () => {
    const mergedTracks = mergeTrackLibraries(
      [
        { id: "presence", title: "Presence", storageKey: "music/Instrumental Study Tracks/Presence.mp3" },
        { id: "stillness", title: "Stillness", storageKey: "music/Instrumental Study Tracks/Stillness.mp3" },
      ],
      [
        { id: "stillness", title: "Stillness", storageKey: "music/Instrumental Study Tracks/Stillness.mp3" },
        { id: "vocal", title: "No Condemnation", storageKey: "music/Romans 8 Verses 1-4 NIV/No Condemnation.mp3" },
      ],
    );

    expect(mergedTracks.map((track) => track.id)).toEqual([
      "presence",
      "stillness",
      "vocal",
    ]);
  });
});
