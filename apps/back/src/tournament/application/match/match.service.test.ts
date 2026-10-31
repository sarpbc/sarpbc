import { beforeEach, describe, expect, it, vi } from "vitest";
import { Match, TournamentParticipant } from "../../domain/competition";
import { matchDecided } from "../../domain/match-decided";
import { MatchService } from "./match.service";

describe("MatchService decided events", () => {
  const participants = ["a", "b"].map((id) => Object.assign(new TournamentParticipant(), { id }));
  const stored = Object.assign(new Match(), { id: "match", participants });
  const matches = {
    load: vi.fn(),
    byPandascoreId: vi.fn(),
    save: vi.fn(),
    tournament: vi.fn(),
    participants: vi.fn(),
  };
  const reads = { detail: vi.fn() };
  const events = { publish: vi.fn() };
  const diagnostics = { error: vi.fn(), warn: vi.fn() };
  const service = new MatchService(
    reads as never,
    { run: (work: (scope: never) => unknown) => work({ matches } as never) } as never,
    events,
    diagnostics,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    matches.load.mockResolvedValue(stored);
    matches.tournament.mockResolvedValue({ id: "cup" });
    matches.participants.mockResolvedValue(participants);
    matches.byPandascoreId.mockResolvedValue(null);
  });

  it("publishes MatchDecided once a winner is set", async () => {
    reads.detail.mockResolvedValue(
      Object.assign(new Match(), { id: "match", status: "finished", winner: participants[0] }),
    );
    await service.setMatchWinner("match", "a");
    expect(events.publish).toHaveBeenCalledWith(matchDecided("match"));
  });

  it("stays silent for an undecided match", async () => {
    reads.detail.mockResolvedValue(Object.assign(new Match(), { id: "match", status: "running" }));
    await service.upsertMatch("cup", { name: "Final", participantIds: ["a", "b"] });
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("does not re-score a decided match when only its VODs change", async () => {
    const decided = Object.assign(new Match(), {
      id: "match",
      status: "finished",
      winner: participants[0],
    });
    matches.load.mockResolvedValue(decided);
    reads.detail.mockResolvedValue(decided);
    await service.setVods("match", [{ game: 1, url: "https://youtu.be/a", language: "en" }]);
    await service.setGameVods("match", 2, []);
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("returns the match when publication fails", async () => {
    reads.detail.mockResolvedValue(
      Object.assign(new Match(), { id: "match", status: "finished", winner: participants[0] }),
    );
    events.publish.mockRejectedValue(new Error("listener"));
    await expect(service.setMatchWinner("match", "a")).resolves.toMatchObject({ id: "match" });
    expect(diagnostics.error).toHaveBeenCalledWith(
      "MatchDecided publication failed",
      expect.any(Error),
    );
  });
});

describe("MatchService match blocks", () => {
  const reads = { byIds: vi.fn(), page: vi.fn() };
  const service = new MatchService(reads as never, {} as never, {} as never, {} as never);
  const stored = (id: string) => Object.assign(new Match(), { id });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads every picked match in one query and keeps each block's order", async () => {
    reads.byIds.mockResolvedValue([stored("b"), stored("a")]);

    const [single, manual] = await service.findBlocks([
      { kind: "match", id: "a" },
      { kind: "matches", ids: ["b", "missing", "a"] },
    ]);

    expect(reads.byIds).toHaveBeenCalledTimes(1);
    expect(reads.byIds).toHaveBeenCalledWith(["a", "b", "missing"]);
    expect(reads.page).not.toHaveBeenCalled();
    expect(single?.map((match) => match.id)).toEqual(["a"]);
    expect(manual?.map((match) => match.id)).toEqual(["b", "a"]);
  });

  it("puts live, then upcoming, then recent results of a scope up to its limit", async () => {
    reads.page.mockImplementation(async (kind: string) =>
      kind === "live"
        ? [stored("live")]
        : kind === "upcoming"
          ? [stored("next"), stored("later")]
          : [stored("result")],
    );

    const [tournament, team] = await service.findBlocks([
      { kind: "tournament", id: "cup", limit: 3 },
      { kind: "team", id: "falcons", limit: 10 },
    ]);

    expect(reads.byIds).not.toHaveBeenCalled();
    expect(reads.page).toHaveBeenCalledWith("live", { limit: 3, tournamentId: "cup" });
    expect(reads.page).toHaveBeenCalledWith("results", { limit: 10, teamId: "falcons" });
    expect(tournament?.map((match) => match.id)).toEqual(["live", "next", "later"]);
    expect(team?.map((match) => match.id)).toEqual(["live", "next", "later", "result"]);
  });
});
