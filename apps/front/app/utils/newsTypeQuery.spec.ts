import { describe, expect, it } from "vitest";
import { isNewsType, resolveNewsType } from "./newsTypeQuery";

describe("isNewsType", () => {
  it("accepts short and article", () => {
    expect(isNewsType("short")).toBe(true);
    expect(isNewsType("article")).toBe(true);
    expect(isNewsType("brief")).toBe(false);
  });
});

describe("resolveNewsType", () => {
  it("defaults unknown values to short", () => {
    expect(resolveNewsType("article")).toBe("article");
    expect(resolveNewsType(undefined)).toBe("short");
    expect(resolveNewsType("brief")).toBe("short");
  });
});
