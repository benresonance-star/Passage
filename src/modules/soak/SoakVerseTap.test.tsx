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

// Initial mount sequence: pause(100) + fade-in(800) + cooldown(1200) = 2100ms
const MOUNT_TO_READY_MS = 2100;
// Full verse transition: fade-out(800) + pause(100) + fade-in(800) = 1700ms
const TRANSITION_MS = 1700;
const COOLDOWN_MS = 1200;

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

/* ─── Swipe simulation helpers ────────────────────────────────────── */

/**
 * Simulate a horizontal swipe on the soak-breathe element.
 * Negative deltaX = swipe left (next), positive = swipe right (prev).
 */
function simulateSwipe(element: HTMLElement, deltaX: number) {
  const startX = 200;
  const startY = 300;

  fireEvent.touchStart(element, {
    touches: [{ clientX: startX, clientY: startY }],
  });
  fireEvent.touchEnd(element, {
    changedTouches: [{ clientX: startX + deltaX, clientY: startY }],
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

  // ── Swipe Navigation ──────────────────────────────────────────

  it("navigates forward on swipe left", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    expect(screen.getByTestId("soak-verse").textContent).toContain("therefore");

    // Swipe left (negative delta) → next verse
    simulateSwipe(screen.getByTestId("soak-breathe"), -80);
    completeTransitionAndCooldown();

    expect(screen.getByTestId("soak-verse").textContent).toContain("Christ Jesus");
    expect(screen.getByTestId("soak-verse").textContent).not.toContain("therefore");
  });

  it("navigates backward on swipe right", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    // Go forward first
    simulateSwipe(screen.getByTestId("soak-breathe"), -80);
    completeTransitionAndCooldown();

    // Swipe right → previous verse
    simulateSwipe(screen.getByTestId("soak-breathe"), 80);
    completeTransitionAndCooldown();

    expect(screen.getByTestId("soak-verse").textContent).toContain("therefore");
  });

  it("ignores swipes below threshold", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    const textBefore = screen.getByTestId("soak-verse").textContent;

    // Swipe too short (below 50px threshold)
    simulateSwipe(screen.getByTestId("soak-breathe"), -30);
    act(() => jest.advanceTimersByTime(5000));

    expect(screen.getByTestId("soak-verse").textContent).toBe(textBefore);
  });

  it("ignores vertical swipes", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    const textBefore = screen.getByTestId("soak-verse").textContent;
    const element = screen.getByTestId("soak-breathe");

    // Vertical swipe (large Y delta, small X delta)
    fireEvent.touchStart(element, {
      touches: [{ clientX: 200, clientY: 200 }],
    });
    fireEvent.touchEnd(element, {
      changedTouches: [{ clientX: 220, clientY: 400 }],
    });

    act(() => jest.advanceTimersByTime(5000));
    expect(screen.getByTestId("soak-verse").textContent).toBe(textBefore);
  });

  // ── Swipe gating ──────────────────────────────────────────────

  it("blocks swipe while a transition is running", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    // Start navigation
    simulateSwipe(screen.getByTestId("soak-breathe"), -80);

    // Immediately try again — should be blocked
    simulateSwipe(screen.getByTestId("soak-breathe"), -80);

    completeTransitionAndCooldown();

    // Should be on verse 2, NOT verse 3
    const text = screen.getByTestId("soak-verse").textContent || "";
    expect(text).toContain("Christ Jesus");
    expect(text).not.toContain("because");
  });

  it("blocks swipe for 1500ms after a verse appears", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    simulateSwipe(screen.getByTestId("soak-breathe"), -80);

    // Complete transition only (no cooldown)
    act(() => jest.advanceTimersByTime(TRANSITION_MS));

    // Try to navigate — should be blocked
    simulateSwipe(screen.getByTestId("soak-breathe"), -80);
    act(() => jest.advanceTimersByTime(0));

    expect(screen.getByTestId("soak-verse").textContent).toContain("Christ Jesus");
    expect(screen.getByTestId("soak-verse").textContent).not.toContain("because");

    // Now wait for cooldown
    act(() => jest.advanceTimersByTime(COOLDOWN_MS));

    simulateSwipe(screen.getByTestId("soak-breathe"), -80);
    completeTransitionAndCooldown();

    expect(screen.getByTestId("soak-verse").textContent).toContain("because");
  });

  // ── Word highlighting ─────────────────────────────────────────

  it("toggles word highlight on click", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    const word = screen.getByTestId("soak-word-0");

    expect(word.className).not.toContain("soak-word-highlighted");

    fireEvent.click(word);
    expect(word.className).toContain("soak-word-highlighted");

    fireEvent.click(word);
    expect(word.className).not.toContain("soak-word-highlighted");
  });

  it("highlights reset when verse changes", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    fireEvent.click(screen.getByTestId("soak-word-0"));
    expect(screen.getByTestId("soak-word-0").className).toContain("soak-word-highlighted");

    simulateSwipe(screen.getByTestId("soak-breathe"), -80);
    completeTransitionAndCooldown();

    expect(screen.getByTestId("soak-word-0").className).not.toContain("soak-word-highlighted");
  });

  // ── DOM stability ─────────────────────────────────────────────

  it("breathing background element is the same DOM node across verse changes", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    const bgBefore = screen.getByTestId("soak-breathe");

    simulateSwipe(screen.getByTestId("soak-breathe"), -80);
    completeTransitionAndCooldown();

    const bgAfter = screen.getByTestId("soak-breathe");
    expect(bgBefore).toBe(bgAfter);
  });

  // ── Desktop click-zone navigation ─────────────────────────────

  it("navigates forward on right-zone click (desktop)", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    expect(screen.getByTestId("soak-verse").textContent).toContain("therefore");

    fireEvent.click(screen.getByTestId("soak-zone-right"));
    completeTransitionAndCooldown();

    expect(screen.getByTestId("soak-verse").textContent).toContain("Christ Jesus");
  });

  it("navigates backward on left-zone click (desktop)", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    // Go forward first
    fireEvent.click(screen.getByTestId("soak-zone-right"));
    completeTransitionAndCooldown();

    // Go back
    fireEvent.click(screen.getByTestId("soak-zone-left"));
    completeTransitionAndCooldown();

    expect(screen.getByTestId("soak-verse").textContent).toContain("therefore");
  });

  it("center zone click reveals exit icon (desktop)", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    const exitButton = screen.getByTestId("soak-exit-button");
    expect(exitButton.style.opacity).toBe("0.12");

    fireEvent.click(screen.getByTestId("soak-zone-center"));
    expect(exitButton.style.opacity).toBe("0.7");
  });

  // ── Exit icon ─────────────────────────────────────────────────

  it("exit icon appears on tap and calls onExit when clicked", () => {
    const onExit = jest.fn();
    render(<SoakVerseTap section={SECTION} onExit={onExit} />);
    waitForReady();

    const exitButton = screen.getByTestId("soak-exit-button");

    // Initially nearly invisible (opacity ~0.12)
    expect(exitButton.style.opacity).toBe("0.12");

    // Tap the center zone to reveal
    fireEvent.click(screen.getByTestId("soak-zone-center"));

    // Now visible
    expect(exitButton.style.opacity).toBe("0.7");

    // Tap the exit button itself
    fireEvent.click(exitButton);

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("exit icon auto-hides after 3 seconds", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    const exitButton = screen.getByTestId("soak-exit-button");

    // Reveal
    fireEvent.click(screen.getByTestId("soak-zone-center"));
    expect(exitButton.style.opacity).toBe("0.7");

    // Wait 3 seconds
    act(() => jest.advanceTimersByTime(3000));

    expect(exitButton.style.opacity).toBe("0.12");
  });

  // ── Past-the-edge does not exit (exit is via icon only) ───────

  it("does not navigate past the edges", () => {
    render(<SoakVerseTap section={SECTION} />);
    waitForReady();

    const textBefore = screen.getByTestId("soak-verse").textContent;

    // Try swiping right at the start — should do nothing
    simulateSwipe(screen.getByTestId("soak-breathe"), 80);
    act(() => jest.advanceTimersByTime(5000));

    expect(screen.getByTestId("soak-verse").textContent).toBe(textBefore);
  });
});
