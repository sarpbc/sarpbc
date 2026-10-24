import { describe, expect, it, vi } from "vitest";
import { registerReadTools } from "./read-tools";

describe("MCP read tools", () => {
  const matchService = {
    findUpcomingAndCount: vi.fn().mockResolvedValue([[], 0]),
    findLiveAndCount: vi.fn().mockResolvedValue([[], 0]),
    findResultsAndCount: vi.fn().mockResolvedValue([[], 0]),
  };
  const tournamentService = { find: vi.fn().mockResolvedValue([[], 0]) };
  const registerTool = vi.fn();
  registerReadTools({ registerTool } as never, { matchService, tournamentService } as never);
  const call = (name: string) => registerTool.mock.calls.find((args) => args[0] === name)?.[2]({});

  it("excludes start.gg rows in the list queries so totals and pages stay consistent", async () => {
    await call("get_upcoming_matches");
    await call("get_match_results");
    await call("get_tournaments");

    const redistributableOnly = expect.objectContaining({ redistributableOnly: true });
    expect(matchService.findUpcomingAndCount).toHaveBeenCalledWith(redistributableOnly);
    expect(matchService.findLiveAndCount).toHaveBeenCalledWith(redistributableOnly);
    expect(matchService.findResultsAndCount).toHaveBeenCalledWith(redistributableOnly);
    expect(tournamentService.find).toHaveBeenCalledWith(redistributableOnly);
  });
});
