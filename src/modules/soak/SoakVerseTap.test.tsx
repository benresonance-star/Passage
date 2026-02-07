/**
 * SoakVerseTap — React Testing Library tests
 *
 * Prerequisites (dev dependencies):
 *   npm i -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
 *
 * Jest config must map CSS imports to a stub:
 *   moduleNameMapper: { "\\.(css)$": "identity-obj-proxy" }
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import { SoakVerseTap } from "./SoakVerseTap";
import type { SoakSection } from "./types";

/* ─── Fixtures ────────────────────────────────────────────────────── */

const SECTION: SoakSection = {
  id: "test-section",
  verses: [
    { id: "v1", text: "There is therefore now no condemnation" },
    { id: "v2", text: "for those who are in Christ Jesus" },
    { id: "v3", text: "because through Christ Jesus the law" },
  ],
};

/* ─── Timing helpers ──────────────────────────────────────────────── */

// Initial mount sequence: pause(400) + fade-in(1100) + cooldown(1500) = 3000ms
const MOUNT_TO_READY_MS = 3000;
// Full verse transition: fade-out(400) + pause(400) + fade-in(1100) = 1900ms
const TRANSITION_MS = 1900;
const COOLDOWN_MS = 1500;

/** Advance fake timers past the initial mount sequence so navigation is possible. */
function waitForReady() {
  act(() => {
    jest.advanceTimersByTime(MOUNT_TO_READY_MS);
  });
}

/** Complete a verse transition + cooldown so the next navigation is possible. */
function completeTransitionAndCooldown() {
  act(() => {
    jest.advanceTimersByTime(TRANSITION_MS + COOLDOWN_MS);
  });
}

/* ─── Test suite ──────────────────────────────────────────────────── */

describe("SoakVerseTap", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Navigation ─────────────────────────────────────────────────

  it("navigates forward on right-zone tap", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    // Should start on verse 1
    expect(screen.getByTestId("soak-verse").textContent).toContain(
      "therefore",
    );

    fireEvent.click(screen.getByTestId("soak-zone-right"));
    completeTransitionAndCooldown();

    // Should now show verse 2
    expect(screen.getByTestId("soak-verse").textContent).toContain(
      "Christ Jesus",
    );
    expect(screen.getByTestId("soak-verse").textContent).not.toContain(
      "therefore",
    );
  });

  it("navigates backward on left-zone tap", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    // Go forward first
    fireEvent.click(screen.getByTestId("soak-zone-right"));
    completeTransitionAndCooldown();

    // Now go back
    fireEvent.click(screen.getByTestId("soak-zone-left"));
    completeTransitionAndCooldown();

    // Should be back on verse 1
    expect(screen.getByTestId("soak-verse").textContent).toContain(
      "therefore",
    );
  });

  it("center zone does nothing", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    const textBefore = screen.getByTestId("soak-verse").textContent;
    fireEvent.click(screen.getByTestId("soak-zone-center"));

    // Advance time generously — nothing should change
    act(() => jest.advanceTimersByTime(5000));

    expect(screen.getByTestId("soak-verse").textContent).toBe(textBefore);
  });

  // ── Tap gating ────────────────────────────────────────────────

  it("blocks navigation while a transition is running", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    // Start a navigation (verse 1 → 2)
    fireEvent.click(screen.getByTestId("soak-zone-right"));

    // Immediately try to navigate again (verse 2 → 3) — should be blocked
    fireEvent.click(screen.getByTestId("soak-zone-right"));

    // Complete the transition
    completeTransitionAndCooldown();

    // Should be on verse 2, NOT verse 3
    const text = screen.getByTestId("soak-verse").textContent || "";
    expect(text).toContain("Christ Jesus");
    expect(text).not.toContain("because");
  });

  it("blocks navigation for 1500ms after a verse appears", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    // Navigate to verse 2
    fireEvent.click(screen.getByTestId("soak-zone-right"));

    // Complete the transition only (no cooldown)
    act(() => jest.advanceTimersByTime(TRANSITION_MS));

    // Try to navigate — should be blocked (cooldown not expired)
    fireEvent.click(screen.getByTestId("soak-zone-right"));
    act(() => jest.advanceTimersByTime(0));

    // Still on verse 2
    expect(screen.getByTestId("soak-verse").textContent).toContain(
      "Christ Jesus",
    );
    expect(screen.getByTestId("soak-verse").textContent).not.toContain(
      "because",
    );

    // Now wait for cooldown
    act(() => jest.advanceTimersByTime(COOLDOWN_MS));

    // Navigate should now work
    fireEvent.click(screen.getByTestId("soak-zone-right"));
    completeTransitionAndCooldown();

    expect(screen.getByTestId("soak-verse").textContent).toContain("because");
  });

  // ── Word highlighting ─────────────────────────────────────────

  it("toggles word highlight on click", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    const word = screen.getByTestId("soak-word-0");

    // Initially not highlighted
    expect(word.className).not.toContain("soak-word-highlighted");

    // Click to highlight
    fireEvent.click(word);
    expect(word.className).toContain("soak-word-highlighted");

    // Click again to un-highlight
    fireEvent.click(word);
    expect(word.className).not.toContain("soak-word-highlighted");
  });

  it("word click does not trigger navigation", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    const textBefore = screen.getByTestId("soak-verse").textContent;

    // Click several words
    fireEvent.click(screen.getByTestId("soak-word-0"));
    fireEvent.click(screen.getByTestId("soak-word-1"));

    // No transition should have started — text unchanged
    act(() => jest.advanceTimersByTime(5000));
    expect(screen.getByTestId("soak-verse").textContent).toBe(textBefore);
  });

  it("highlights reset when verse changes", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    // Highlight a word on verse 1
    fireEvent.click(screen.getByTestId("soak-word-0"));
    expect(screen.getByTestId("soak-word-0").className).toContain(
      "soak-word-highlighted",
    );

    // Navigate to verse 2
    fireEvent.click(screen.getByTestId("soak-zone-right"));
    completeTransitionAndCooldown();

    // Verse 2's first word should NOT be highlighted
    expect(screen.getByTestId("soak-word-0").className).not.toContain(
      "soak-word-highlighted",
    );
  });

  // ── DOM stability ─────────────────────────────────────────────

  it("breathing background element is the same DOM node across verse changes", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    const bgBefore = screen.getByTestId("soak-breathe");

    // Navigate forward
    fireEvent.click(screen.getByTestId("soak-zone-right"));
    completeTransitionAndCooldown();

    const bgAfter = screen.getByTestId("soak-breathe");

    // Strict reference equality — same DOM node, not a remount
    expect(bgBefore).toBe(bgAfter);
  });

  // ── Exit ──────────────────────────────────────────────────────

  it("calls onExit when navigating past the last verse", () => {
    const onExit = jest.fn();
    render(<SoakVerseTap section={SECTION} onExit={onExit} />);
    waitForReady();

    // Go to verse 2
    fireEvent.click(screen.getByTestId("soak-zone-right"));
    completeTransitionAndCooldown();

    // Go to verse 3
    fireEvent.click(screen.getByTestId("soak-zone-right"));
    completeTransitionAndCooldown();

    // Try to go past the end
    fireEvent.click(screen.getByTestId("soak-zone-right"));

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("calls onExit when navigating before the first verse", () => {
    const onExit = jest.fn();
    render(<SoakVerseTap section={SECTION} onExit={onExit} />);
    waitForReady();

    // Try to go before the start
    fireEvent.click(screen.getByTestId("soak-zone-left"));

    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

