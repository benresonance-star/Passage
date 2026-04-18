import { describe, expect, it } from "vitest";
import {
  cycleAbideTextVisibility,
  hasBackingTracks,
  isSongEntryMode,
  shouldRenderAbideAudioPlayer,
} from "./audioState";

const backingTracks = [
  {
    id: "track-1",
    title: "Presence",
    storageKey: "music/Instrumental Study Tracks/Presence.mp3",
  },
];

describe("study audio state", () => {
  it("treats the default backing library as available when tracks exist", () => {
    expect(hasBackingTracks(backingTracks)).toBe(true);
    expect(hasBackingTracks([])).toBe(false);
  });

  it("keeps song entry mode tied to the explicit mode flag", () => {
    expect(isSongEntryMode(true, backingTracks)).toBe(true);
    expect(isSongEntryMode(false, backingTracks)).toBe(false);
    expect(isSongEntryMode(true, [])).toBe(false);
  });

  it("shows the Abide player whenever the soak stage has backing tracks", () => {
    expect(shouldRenderAbideAudioPlayer("soak", backingTracks)).toBe(true);
    expect(shouldRenderAbideAudioPlayer("read", backingTracks)).toBe(false);
    expect(shouldRenderAbideAudioPlayer("soak", [])).toBe(false);
  });

  it("cycles the Abide text visibility through normal, dim, and off", () => {
    expect(cycleAbideTextVisibility("normal")).toBe("dim");
    expect(cycleAbideTextVisibility("dim")).toBe("off");
    expect(cycleAbideTextVisibility("off")).toBe("normal");
  });
});
