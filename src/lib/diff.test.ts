import { describe, it, expect } from "vitest";
import { calculateDiff } from "./diff";

describe("calculateDiff", () => {
  it("returns 100% accuracy for a perfect match", () => {
    const { accuracy, results } = calculateDiff("hello world", "hello world");
    expect(accuracy).toBe(100);
    expect(results.every((r) => r.status === "correct")).toBe(true);
  });

  it("returns 0% accuracy for empty input", () => {
    const { accuracy } = calculateDiff("hello world", "");
    expect(accuracy).toBe(0);
  });

  it("marks missing words when user skips a word", () => {
    const { accuracy, results } = calculateDiff("the quick brown fox", "the brown fox");
    const missing = results.filter((r) => r.status === "missing");
    expect(missing).toHaveLength(1);
    expect(missing[0].word).toBe("quick");
    expect(accuracy).toBe(75);
  });

  it("marks extra words that the user added", () => {
    const { results } = calculateDiff("hello world", "hello beautiful world");
    const extra = results.filter((r) => r.status === "extra");
    expect(extra).toHaveLength(1);
    expect(extra[0].word).toBe("beautiful");
  });

  it("ignores punctuation and case in matching", () => {
    const { accuracy } = calculateDiff("Hello, World!", "hello world");
    expect(accuracy).toBe(100);
  });

  it("handles completely wrong input", () => {
    const { accuracy, results } = calculateDiff("the quick brown fox", "xyz abc def ghi");
    expect(accuracy).toBe(0);
    const extra = results.filter((r) => r.status === "extra");
    expect(extra).toHaveLength(4);
  });

  it("handles empty expected text", () => {
    const { accuracy } = calculateDiff("", "some words");
    expect(accuracy).toBe(0);
  });

  it("tracks multiple missing words in sequence", () => {
    const { results } = calculateDiff("a b c d e", "a e");
    const missing = results.filter((r) => r.status === "missing");
    expect(missing.map((m) => m.word)).toEqual(["b", "c", "d"]);
  });
});
