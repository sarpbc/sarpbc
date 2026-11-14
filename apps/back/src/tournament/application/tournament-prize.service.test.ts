import { describe, expect, it, vi } from "vitest";
import type { DataSource, PrizeEntry } from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type {
  CompetitionCache,
  CompetitionDiagnostics,
  CompetitionEvents,
  PrizeParticipant,
  PrizeQueries,
  PrizeTransaction,
  PrizeWriter,
} from "./ports";
import { CompetitionAfterCommit } from "./after-commit";
import { TournamentPrizeService } from "./tournament-prize.service";

const entry: PrizeEntry = {
  placement: 1,
  amount: 1000,
  currency: "USD",
  teamId: "team-a",
  playerIds: ["player-a"],
  sourceUrl: null,
};

const RULES = "https://www.rocketleague.com/en/news/rlcs-official-rules";

const rosterA: PrizeParticipant = { teamId: "team-a", playerIds: ["player-a", "player-b"] };

function setup({
  exists = true,
  participants = [rosterA],
  source = "manual",
}: { exists?: boolean; participants?: PrizeParticipant[]; source?: DataSource | null } = {}) {
  const writer = {
    tournamentExists: vi.fn<PrizeWriter["tournamentExists"]>().mockResolvedValue(exists),
    participants: vi.fn<PrizeWriter["participants"]>().mockResolvedValue(participants),
    entries: vi.fn<PrizeWriter["entries"]>().mockResolvedValue([entry]),
    replace: vi.fn<PrizeWriter["replace"]>(),
  };

  const reads = {
    tournamentSource: vi.fn<PrizeQueries["tournamentSource"]>().mockResolvedValue(source),
    byTournament: vi
      .fn<PrizeQueries["byTournament"]>()
      .mockResolvedValue({ source: "manual", prizepool: null, prizes: [] }),
    byTeam: vi.fn<PrizeQueries["byTeam"]>().mockResolvedValue([]),
    byPlayer: vi.fn<PrizeQueries["byPlayer"]>().mockResolvedValue([]),
  };

  const transaction: PrizeTransaction = { run: async (work) => await work({ prizes: writer }) };
  const cache = { invalidateTournament: vi.fn<CompetitionCache["invalidateTournament"]>() };
  const diagnostics = { error: vi.fn<CompetitionDiagnostics["error"]>() };

  const service = new TournamentPrizeService(
    reads,
    transaction,
    new CompetitionAfterCommit(
      cache,
      { publish: vi.fn<CompetitionEvents["publish"]>() },
      diagnostics,
    ),
  );

  return { service, reads, writer, cache, diagnostics };
}

describe(TournamentPrizeService, () => {
  it("replaces the distribution inside the competition transaction", async () => {
    const { service, writer, reads } = setup();

    await service.setDistribution("cup", [entry]);

    expect(writer.participants).toHaveBeenCalledWith("cup");
    expect(writer.replace).toHaveBeenCalledWith("cup", [entry]);
    expect(reads.byTournament).toHaveBeenCalledWith("cup");
  });

  it("invalidates the cached tournament and keeps the saved distribution when Redis fails", async () => {
    const { service, cache, diagnostics } = setup();
    cache.invalidateTournament.mockRejectedValue(new Error("Redis down"));

    await expect(service.setDistribution("cup", [entry])).resolves.toMatchObject({ prizes: [] });

    expect(cache.invalidateTournament).toHaveBeenCalledWith("cup");
    expect(diagnostics.error).toHaveBeenCalledWith(
      "Tournament cache invalidation failed",
      expect.any(Error),
    );
  });

  it("rejects an unknown tournament before writing", async () => {
    const { service, writer } = setup({ exists: false });
    await expect(service.setDistribution("cup", [entry])).rejects.toThrow(NotFoundError);
    expect(writer.replace).not.toHaveBeenCalled();
  });

  it("rejects a team that does not take part in the tournament", async () => {
    const { service, writer } = setup({ participants: [] });
    await expect(service.setDistribution("cup", [entry])).rejects.toThrow(InvalidInputError);
    expect(writer.replace).not.toHaveBeenCalled();
  });

  it("rejects a player outside the tournament roster of the team", async () => {
    const { service, writer } = setup({
      participants: [rosterA, { teamId: "team-b", playerIds: ["player-c"] }],
    });

    await expect(
      service.setDistribution("cup", [{ ...entry, playerIds: ["player-a", "player-c"] }]),
    ).rejects.toThrow(/player-c/);
    expect(writer.replace).not.toHaveBeenCalled();
  });

  it("clears a distribution even when the tournament has no participants", async () => {
    const { service, writer } = setup({ participants: [] });
    await service.setDistribution("cup", []);
    expect(writer.replace).toHaveBeenCalledWith("cup", []);
  });

  it("rejects an invalid distribution without opening a transaction", async () => {
    const { service, writer } = setup();
    await expect(service.setDistribution("cup", [{ ...entry, currency: "ABC" }])).rejects.toThrow(
      InvalidInputError,
    );
    expect(writer.tournamentExists).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown tournament distribution", async () => {
    const { service, reads } = setup();
    reads.byTournament.mockResolvedValue(null);
    await expect(service.findByTournamentId("missing")).rejects.toThrow(NotFoundError);
  });

  it("only accepts proposals for known tournaments outside start.gg", async () => {
    await expect(setup().service.requireProposableTournament("cup")).resolves.toBeUndefined();
    await expect(
      setup({ source: null }).service.requireProposableTournament("cup"),
    ).rejects.toThrow(NotFoundError);
    await expect(
      setup({ source: "startgg" }).service.requireProposableTournament("cup"),
    ).rejects.toThrow(InvalidInputError);
  });

  it("corrects one row and re-sources it without touching the other rows", async () => {
    const { service, writer } = setup({
      participants: [rosterA, { teamId: "team-b", playerIds: [] }],
    });

    const other: PrizeEntry = {
      ...entry,
      placement: 2,
      amount: 500,
      teamId: "team-b",
      playerIds: [],
    };

    writer.entries.mockResolvedValue([entry, other]);

    await service.updateEntry("cup", "team-a", { amount: 1800 }, RULES);

    expect(writer.replace).toHaveBeenCalledWith("cup", [
      { ...entry, amount: 1800, sourceUrl: RULES },
      other,
    ]);
  });

  it("re-sources a row alone when the patch is empty", async () => {
    const { service, writer } = setup();

    await service.updateEntry("cup", "team-a", {}, RULES);

    expect(writer.replace).toHaveBeenCalledWith("cup", [{ ...entry, sourceUrl: RULES }]);
  });

  it("refuses a correction for a team without a prize row", async () => {
    const { service, writer } = setup();
    await expect(service.updateEntry("cup", "team-z", {}, RULES)).rejects.toThrow(NotFoundError);
    expect(writer.replace).not.toHaveBeenCalled();
  });

  it("corrects a row while another row of the stage still cites a refused source", async () => {
    const { service, writer } = setup({
      participants: [rosterA, { teamId: "team-b", playerIds: [] }],
    });

    const legacy: PrizeEntry = {
      ...entry,
      placement: 2,
      teamId: "team-b",
      playerIds: [],
      sourceUrl: "https://blast.tv/rl/open",
    };

    writer.entries.mockResolvedValue([entry, legacy]);

    await service.updateEntry("cup", "team-a", {}, RULES);

    expect(writer.replace).toHaveBeenCalledWith("cup", [{ ...entry, sourceUrl: RULES }, legacy]);
  });

  it("refuses a BLAST.tv source", async () => {
    const { service, writer } = setup();
    await expect(
      service.updateEntry("cup", "team-a", {}, "https://blast.tv/rl/open"),
    ).rejects.toThrow(InvalidInputError);
    expect(writer.replace).not.toHaveBeenCalled();
  });
});
