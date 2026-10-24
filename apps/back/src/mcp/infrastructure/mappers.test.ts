import { describe, expect, it } from "vitest";
import type { DataSource } from "../../common/domain/data-source";
import type { Match } from "../../tournament/domain/competition";
import { isRedistributableMatch } from "./mappers";

function match(source: DataSource, tournamentSource: DataSource, teamSource: DataSource): Match {
  return {
    source,
    tournament: { source: tournamentSource },
    participants: [{ team: { source: teamSource } }],
  } as never;
}

describe("isRedistributableMatch", () => {
  it("keeps a redistributable match with a start.gg participant team", () => {
    expect(isRedistributableMatch(match("manual", "pandascore", "startgg"))).toBe(true);
  });

  it("hides start.gg matches and matches of start.gg tournaments", () => {
    expect(isRedistributableMatch(match("startgg", "startgg", "manual"))).toBe(false);
    expect(isRedistributableMatch(match("manual", "startgg", "manual"))).toBe(false);
  });
});
