import { describe, expect, it } from "vitest";
import { isRedistributable, parseDataSourceUrl, sourceFromUrl } from "./data-source";

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

  it("parses a staff source URL, clearing blanks and refusing BLAST.tv", () => {
    expect(parseDataSourceUrl(" https://www.rocketleague.com/rules ")).toBe(
      "https://www.rocketleague.com/rules",
    );
    expect(parseDataSourceUrl("  ")).toBeNull();
    expect(parseDataSourceUrl(null)).toBeNull();
    expect(() => parseDataSourceUrl("https://blast.tv/rl")).toThrow(/BLAST/u);
  });
});
