import { describe, expect, it } from "vitest";
import { readingTimeMinutes } from "@sarpbc/utils";

describe("readingTimeMinutes", () => {
  it("returns at least one minute for empty content", () => {
    expect(readingTimeMinutes("")).toBe(1);
    expect(readingTimeMinutes("   ")).toBe(1);
  });

  it("counts 200 words as one minute", () => {
    const words = Array.from({ length: 200 }, () => "word").join(" ");
    expect(readingTimeMinutes(words)).toBe(1);
  });

  it("rounds up after 200 words", () => {
    const words = Array.from({ length: 201 }, () => "word").join(" ");
    expect(readingTimeMinutes(words)).toBe(2);
  });

  it("strips markdown and entity tags before counting", () => {
    const content = Array.from(
      { length: 200 },
      () => '**word** :player{slug="comm" label="Comm"}',
    ).join(" ");
    expect(readingTimeMinutes(content)).toBe(2);
  });
});
