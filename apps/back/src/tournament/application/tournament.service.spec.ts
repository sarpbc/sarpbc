import { describe, expect, it, vi } from "vitest";
import { TournamentService } from "./tournament.service";

describe("TournamentService.findPandascoreActiveIds", () => {
  const tournamentRepository = { findPandascoreActive: vi.fn() };
  const service = new TournamentService(
    tournamentRepository as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it("selects tournaments starting within a day or ended less than six hours ago", async () => {
    tournamentRepository.findPandascoreActive.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    const now = new Date("2026-04-24T12:00:00Z");

    const ids = await service.findPandascoreActiveIds(now);

    expect(ids).toEqual(["a", "b"]);
    expect(tournamentRepository.findPandascoreActive).toHaveBeenCalledWith({
      beginsBefore: new Date("2026-04-25T12:00:00Z"),
      beganAfter: new Date("2026-04-17T12:00:00Z"),
      endsAfter: new Date("2026-04-24T06:00:00Z"),
    });
  });
});
