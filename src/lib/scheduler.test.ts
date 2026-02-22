import { describe, it, expect } from "vitest";
import { updateCard } from "./scheduler";
import type { SM2Card } from "@/types";

function freshCard(): SM2Card {
  return {
    id: "test-v1-3",
    ease: 2.5,
    intervalDays: 0,
    reps: 0,
    lapses: 0,
    nextDueAt: new Date().toISOString(),
    lastScore: null,
    hardUntilAt: null,
    isMemorised: false,
  };
}

describe("updateCard", () => {
  it("sets interval to 1 day after first high-score rep", () => {
    const card = freshCard();
    const updated = updateCard(card, 0.95);
    expect(updated.intervalDays).toBe(1);
    expect(updated.reps).toBe(1);
    expect(updated.hardUntilAt).toBeNull();
  });

  it("sets interval to 6 days after second high-score rep", () => {
    let card = freshCard();
    card = updateCard(card, 0.95);
    card = updateCard(card, 0.95);
    expect(card.intervalDays).toBe(6);
    expect(card.reps).toBe(2);
  });

  it("multiplies interval by ease on subsequent high-score reps", () => {
    let card = freshCard();
    card = updateCard(card, 0.95); // 1 day
    card = updateCard(card, 0.95); // 6 days
    const prevEase = card.ease;
    card = updateCard(card, 0.95); // 6 * ease
    expect(card.intervalDays).toBe(Math.round(6 * prevEase));
    expect(card.reps).toBe(3);
  });

  it("auto-promotes to memorised after 3 consecutive high scores", () => {
    let card = freshCard();
    card = updateCard(card, 0.95);
    card = updateCard(card, 0.95);
    expect(card.isMemorised).toBe(false);
    card = updateCard(card, 0.95);
    expect(card.isMemorised).toBe(true);
  });

  it("halves interval and reduces ease on shaky score (0.75-0.89)", () => {
    let card = freshCard();
    card = updateCard(card, 0.95); // interval=1, ease≈2.6
    const prevEase = card.ease;
    card = updateCard(card, 0.8);
    expect(card.intervalDays).toBe(1); // max(1, round(1 * 0.5))
    expect(card.ease).toBeLessThan(prevEase);
  });

  it("resets reps and lapses on failure (<0.75)", () => {
    let card = freshCard();
    card = updateCard(card, 0.95);
    card = updateCard(card, 0.95);
    card = updateCard(card, 0.3);
    expect(card.reps).toBe(0);
    expect(card.intervalDays).toBe(0);
    expect(card.lapses).toBe(1);
    expect(card.hardUntilAt).not.toBeNull();
  });

  it("demotes memorised card on failure", () => {
    let card = freshCard();
    card = updateCard(card, 0.95);
    card = updateCard(card, 0.95);
    card = updateCard(card, 0.95);
    expect(card.isMemorised).toBe(true);
    card = updateCard(card, 0.3);
    expect(card.isMemorised).toBe(false);
  });

  it("never drops ease below 1.3", () => {
    let card = freshCard();
    card.ease = 1.3;
    card = updateCard(card, 0.3);
    expect(card.ease).toBe(1.3);
    card = updateCard(card, 0.3);
    expect(card.ease).toBe(1.3);
  });
});
