import { describe, expect, it } from "vitest";
import { parseDataSourceUrl } from "./data-source";

describe("data source", () => {
  it("parses a staff source URL, clearing blanks and refusing BLAST.tv and start.gg", () => {
    expect(parseDataSourceUrl(" https://www.rocketleague.com/rules ")).toBe(
      "https://www.rocketleague.com/rules",
    );
    expect(parseDataSourceUrl("  ")).toBeNull();
    expect(parseDataSourceUrl(null)).toBeNull();
    expect(() => parseDataSourceUrl("https://blast.tv/rl")).toThrow(/BLAST/u);
    expect(() => parseDataSourceUrl("https://www.start.gg/tournament/rlcs")).toThrow(/start\.gg/u);
  });
});
