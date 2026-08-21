import { describe, expect, it } from "vitest";
import { homepageNewsHeadingLevel } from "./homepageNewsHeadingLevel";

describe("homepageNewsHeadingLevel", () => {
  it("uses h1 for the featured article only", () => {
    expect(homepageNewsHeadingLevel("featured", "featured")).toBe("h1");
    expect(homepageNewsHeadingLevel("other", "featured")).toBe("h2");
    expect(homepageNewsHeadingLevel("only", null)).toBe("h2");
  });
});
