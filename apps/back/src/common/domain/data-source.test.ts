import { describe, expect, it } from "vitest";
import { isRedistributable, sourceFromUrl } from "./data-source";

describe("data source", () => {
  it("flags start.gg URLs, including subdomains", () => {
    expect(sourceFromUrl("https://www.start.gg/tournament/rlcs/event/main")).toBe("startgg");
    expect(sourceFromUrl("https://start.gg/tournament/rlcs")).toBe("startgg");
    expect(sourceFromUrl("https://notstart.gg/x")).toBe("manual");
    expect(sourceFromUrl("https://x.com/team/status/1")).toBe("manual");
  });

  it("only forbids redistributing start.gg tournaments and matches", () => {
    expect(isRedistributable("pandascore")).toBe(true);
    expect(isRedistributable("manual")).toBe(true);
    expect(isRedistributable("startgg")).toBe(false);
  });
});
