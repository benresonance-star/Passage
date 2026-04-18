import { afterEach, describe, expect, it } from "vitest";
import {
  clearResolvedTrackUrlCache,
  resolveTrackUrl,
} from "./resolveTrackUrl";

const BASE_ENV = process.env.NEXT_PUBLIC_AUDIO_BASE_URL;

afterEach(() => {
  clearResolvedTrackUrlCache();

  if (BASE_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_AUDIO_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_AUDIO_BASE_URL = BASE_ENV;
  }
});

describe("resolveTrackUrl", () => {
  it("returns an absolute storage key unchanged", () => {
    const url = resolveTrackUrl({
      id: "absolute",
      title: "Absolute",
      storageKey: "https://cdn.example.com/audio/theme.mp3",
    });

    expect(url).toBe("https://cdn.example.com/audio/theme.mp3");
  });

  it("builds a URL from NEXT_PUBLIC_AUDIO_BASE_URL", () => {
    process.env.NEXT_PUBLIC_AUDIO_BASE_URL = "https://cdn.example.com/audio/";

    const url = resolveTrackUrl({
      id: "base-url",
      title: "Base URL",
      storageKey: "/music/Romans 8 Verses 1-4 NIV/No Condemnation.mp3",
    });

    expect(url).toBe(
      "https://cdn.example.com/audio/music/Romans%208%20Verses%201-4%20NIV/No%20Condemnation.mp3",
    );
  });

  it("falls back to a same-origin public path for Vercel-hosted assets", () => {
    delete process.env.NEXT_PUBLIC_AUDIO_BASE_URL;

    const url = resolveTrackUrl({
      id: "same-origin",
      title: "Same origin",
      storageKey: "music/Romans 8 Verses 1-4 NIV/No Condemnation.mp3",
    });

    expect(url).toBe(
      "/music/Romans%208%20Verses%201-4%20NIV/No%20Condemnation.mp3",
    );
  });
});
