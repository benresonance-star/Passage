import { describe, it, expect } from "vitest";
import { parseChapter, getChapterSlug, chunkVerses, splitIntoLines } from "./parser";

describe("parseChapter", () => {
  it("extracts title from first non-empty line", () => {
    const input = "Romans 8\n\n<1> Therefore...";
    const { title } = parseChapter(input);
    expect(title).toBe("Romans 8");
  });

  it("parses verse tags into scripture verses", () => {
    const input = "Test\n<1> First verse. <2> Second verse.";
    const { verses } = parseChapter(input);
    const scripture = verses.filter((v) => v.type === "scripture");
    expect(scripture).toHaveLength(2);
    expect(scripture[0].number).toBe(1);
    expect(scripture[1].number).toBe(2);
  });

  it("detects headings between verses", () => {
    const input = "Test\n\nA Heading\n\n<1> First verse.";
    const { verses } = parseChapter(input);
    const headings = verses.filter((v) => v.type === "heading");
    expect(headings).toHaveLength(1);
    expect(headings[0].text).toBe("A Heading");
  });

  it("strips URLs when stripRefs is true", () => {
    const input = "Test\nhttps://example.com\n<1> Verse text.";
    const { verses } = parseChapter(input, true);
    const scripture = verses.filter((v) => v.type === "scripture");
    expect(scripture[0].text).not.toContain("https");
  });

  it("auto-fixes missing brackets on verse numbers", () => {
    const input = "Test\n1 In the beginning 2 God created";
    const { verses } = parseChapter(input);
    const scripture = verses.filter((v) => v.type === "scripture");
    expect(scripture.length).toBeGreaterThan(0);
  });

  it("defaults to 'My Chapter' when input is empty", () => {
    const { title } = parseChapter("");
    expect(title).toBe("My Chapter");
  });
});

describe("getChapterSlug", () => {
  it("slugifies the title", () => {
    expect(getChapterSlug("Romans 8")).toBe("romans-8");
  });

  it("includes version and book when provided", () => {
    expect(getChapterSlug("Romans 8", "Romans", "niv")).toBe("niv-romans-romans-8");
  });

  it("strips special characters", () => {
    expect(getChapterSlug("1 Corinthians: 13!")).toBe("1-corinthians-13");
  });

  it("handles extra whitespace and hyphens", () => {
    expect(getChapterSlug("  Psalm  119  ")).toBe("psalm-119");
  });
});

describe("chunkVerses", () => {
  it("groups scripture verses into chunks of the given size", () => {
    const { verses } = parseChapter("Test\n<1> A <2> B <3> C <4> D <5> E");
    const chunks = chunkVerses(verses, "Test", 3);
    expect(chunks.length).toBe(2);
    expect(chunks[0].verseRange).toBe("1-3");
    expect(chunks[1].verseRange).toBe("4-5");
  });

  it("assigns stable IDs based on chapter slug and verse range", () => {
    const { verses } = parseChapter("Test\n<1> A <2> B");
    const chunks = chunkVerses(verses, "Test", 4, "TestBook", "niv");
    expect(chunks[0].id).toBe("niv-testbook-test-v1-2");
  });

  it("splits at max verse count", () => {
    const { verses } = parseChapter("Test\n<1> A <2> B <3> C <4> D <5> E <6> F");
    const chunks = chunkVerses(verses, "Test", 3);
    expect(chunks.length).toBe(2);
    expect(chunks[0].verseRange).toBe("1-3");
    expect(chunks[1].verseRange).toBe("4-6");
  });
});

describe("splitIntoLines", () => {
  it("splits on sentence-ending punctuation", () => {
    const lines = splitIntoLines("First sentence. Second sentence.");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("First");
    expect(lines[1]).toContain("Second");
  });

  it("breaks long lines into sub-lines of ~12 words", () => {
    const long = Array(20).fill("word").join(" ") + ".";
    const lines = splitIntoLines(long);
    expect(lines.length).toBeGreaterThan(1);
  });

  it("returns empty array for empty input", () => {
    expect(splitIntoLines("")).toEqual([]);
  });
});
