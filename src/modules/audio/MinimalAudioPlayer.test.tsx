// @vitest-environment jsdom

import { act } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MinimalAudioPlayer } from "./MinimalAudioPlayer";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

class MockAudio {
  preload = "none";
  src = "";
  duration = 120;
  currentTime = 0;
  ended = false;
  private listeners = new Map<string, Set<() => void>>();

  addEventListener(event: string, listener: () => void) {
    const listeners = this.listeners.get(event) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  pause() {
    this.emit("pause");
  }

  play() {
    this.emit("play");
    return Promise.resolve();
  }

  load() {}

  removeAttribute(attribute: string) {
    if (attribute === "src") {
      this.src = "";
    }
  }

  private emit(event: string) {
    this.listeners.get(event)?.forEach((listener) => listener());
  }
}

describe("MinimalAudioPlayer", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("Audio", MockAudio);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    container?.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("starts collapsed and auto-collapses 3 seconds after expansion", () => {
    act(() => {
      root.render(
        <MinimalAudioPlayer
          tracks={[
            {
              id: "track-1",
              title: "No Condemnation",
              storageKey: "music/Romans 8 Verses 1-4 NIV/No Condemnation.mp3",
            },
          ]}
        />,
      );
    });

    const toggleButton = container.querySelector(
      '[data-testid="soak-audio-toggle"]',
    ) as HTMLButtonElement | null;

    expect(toggleButton?.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      toggleButton?.click();
    });

    expect(toggleButton?.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(toggleButton?.getAttribute("aria-expanded")).toBe("false");
  });

  it("resets the collapse timer after interaction inside the expanded player", () => {
    act(() => {
      root.render(
        <MinimalAudioPlayer
          tracks={[
            {
              id: "track-1",
              title: "No Condemnation",
              storageKey: "music/Romans 8 Verses 1-4 NIV/No Condemnation.mp3",
            },
          ]}
        />,
      );
    });

    const toggleButton = container.querySelector(
      '[data-testid="soak-audio-toggle"]',
    ) as HTMLButtonElement | null;

    act(() => {
      toggleButton?.click();
    });

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    const playButton = container.querySelector(
      '[aria-label="Play audio track"]',
    ) as HTMLButtonElement | null;

    act(() => {
      playButton?.click();
    });

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(toggleButton?.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(toggleButton?.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows an explicit track selector when multiple tracks exist", () => {
    act(() => {
      root.render(
        <MinimalAudioPlayer
          tracks={[
            {
              id: "track-1",
              title: "No Condemnation",
              storageKey: "music/Romans 8 Verses 1-4 NIV/No Condemnation.mp3",
            },
            {
              id: "track-2",
              title: "Walk in the Spirit",
              storageKey: "music/Romans 8 Verses 1-4 NIV/Walk in the Spirit.mp3",
            },
          ]}
        />,
      );
    });

    const toggleButton = container.querySelector(
      '[data-testid="soak-audio-toggle"]',
    ) as HTMLButtonElement | null;

    act(() => {
      toggleButton?.click();
    });

    const trackSelect = container.querySelector(
      '[data-testid="audio-track-select"]',
    ) as HTMLSelectElement | null;

    expect(trackSelect).not.toBeNull();
    expect(trackSelect?.value).toBe("0");

    act(() => {
      trackSelect!.value = "1";
      trackSelect!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(trackSelect?.value).toBe("1");
  });

  it("reports track changes and shows track type labels when requested", () => {
    const handleTrackChange = vi.fn();

    act(() => {
      root.render(
        <MinimalAudioPlayer
          tracks={[
            {
              id: "track-1",
              title: "Presence",
              storageKey: "music/Instrumental Study Tracks/Presence.mp3",
            },
            {
              id: "track-2",
              title: "No Condemnation",
              storageKey: "music/Romans 8 Verses 1-4 NIV/No Condemnation.mp3",
            },
          ]}
          selectedTrackId="track-2"
          onTrackChange={handleTrackChange}
          showTrackTypeLabels
        />,
      );
    });

    const toggleButton = container.querySelector(
      '[data-testid="soak-audio-toggle"]',
    ) as HTMLButtonElement | null;

    act(() => {
      toggleButton?.click();
    });

    const trackSelect = container.querySelector(
      '[data-testid="audio-track-select"]',
    ) as HTMLSelectElement | null;

    expect(trackSelect?.value).toBe("1");
    expect(trackSelect?.textContent).toContain("Presence (Instrumental)");
    expect(trackSelect?.textContent).toContain("No Condemnation (Vocals)");
    expect(handleTrackChange).not.toHaveBeenCalled();
  });

  it("does not snap back to the persisted track after a user selection", () => {
    const handleTrackChange = vi.fn();

    act(() => {
      root.render(
        <MinimalAudioPlayer
          tracks={[
            {
              id: "track-1",
              title: "Presence",
              storageKey: "music/Instrumental Study Tracks/Presence.mp3",
            },
            {
              id: "track-2",
              title: "No Condemnation",
              storageKey: "music/Romans 8 Verses 1-4 NIV/No Condemnation.mp3",
            },
          ]}
          selectedTrackId="track-1"
          onTrackChange={handleTrackChange}
          showTrackTypeLabels
        />,
      );
    });

    const toggleButton = container.querySelector(
      '[data-testid="soak-audio-toggle"]',
    ) as HTMLButtonElement | null;

    act(() => {
      toggleButton?.click();
    });

    const trackSelect = container.querySelector(
      '[data-testid="audio-track-select"]',
    ) as HTMLSelectElement | null;

    expect(trackSelect?.value).toBe("0");

    act(() => {
      trackSelect!.value = "1";
      trackSelect!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(trackSelect?.value).toBe("1");
    expect(handleTrackChange).toHaveBeenCalledTimes(1);
    expect(handleTrackChange.mock.calls[0]?.[0]?.id).toBe("track-2");
  });
});
