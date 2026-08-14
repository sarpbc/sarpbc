import { describe, expect, it } from "vitest";
import { newsCoverTransitionName } from "./newsCoverTransition";

describe("newsCoverTransitionName", () => {
  it("prefixes a CSS-safe ident from the slug", () => {
    expect(newsCoverTransitionName("secondaire")).toBe("news-cover-secondaire");
    expect(newsCoverTransitionName("welcome-2026")).toBe("news-cover-welcome-2026");
    expect(newsCoverTransitionName("a/b c")).toBe("news-cover-a-b-c");
  });
});
