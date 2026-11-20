import { describe, expect, it } from "vitest";
import type { PrizeEntry, TournamentPrizes } from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { PrizeParticipant, PrizeTransaction } from "./ports";
import { recordingCache, recordingDiagnostics, recordingEvents } from "./ports.test-utils";
import { CompetitionAfterCommit } from "./after-commit";
import { TournamentPrizeService } from "./tournament-prize.service";

const entry: PrizeEntry = {
  amount: 1000,
  currency: "USD",
  placement: 1,
  playerIds: ["player-a"],
  sourceUrl: null,
  teamId: "team-a",
};

const RULES = "https://www.rocketleague.com/en/news/rlcs-official-rules";

const rosterA: PrizeParticipant = { playerIds: ["player-a", "player-b"], teamId: "team-a" };

const EMPTY_PRIZES: TournamentPrizes = { prizepool: null, prizes: [] };

const setup = ({
  exists = true,
  participants = [rosterA],
  prizes = EMPTY_PRIZES,
  known = true,
}: {
  exists?: boolean;
  participants?: PrizeParticipant[];
  prizes?: TournamentPrizes | null;
  known?: boolean;
} = {}) => {
  const stored = { entries: [entry] };
  const replaced: { tournamentId: string; entries: PrizeEntry[] }[] = [];

  const writer = {
    entries: async () => stored.entries,
    participants: async () => participants,
    replace: async (tournamentId: string, entries: PrizeEntry[]) => {
      replaced.push({ entries, tournamentId });
    },
    tournamentExists: async () => exists,
  };

  const reads = {
    byPlayer: async () => [],
    byTeam: async () => [],
    byTournament: async () => prizes,
    tournamentExists: async () => known,
  };

  const transaction: PrizeTransaction = { run: async (work) => await work({ prizes: writer }) };

  const cache = recordingCache();
  const diagnostics = recordingDiagnostics();

  const service = new TournamentPrizeService(
    reads,
    transaction,
    new CompetitionAfterCommit(cache, recordingEvents(), diagnostics),
  );

  return { cache, diagnostics, replaced, service, stored };
};

describe(TournamentPrizeService, () => {
  it("replaces the distribution", async () => {
    const { service, replaced, cache } = setup();

    await expect(service.setDistribution("cup", [entry])).resolves.toStrictEqual(EMPTY_PRIZES);

    expect(replaced).toStrictEqual([{ entries: [entry], tournamentId: "cup" }]);
    expect(cache.invalidated).toStrictEqual(["cup"]);
  });

  it("invalidates the cached tournament and keeps the saved distribution when Redis fails", async () => {
    const { service, cache, diagnostics } = setup();
    cache.failWith(new Error("Redis down"));

    await expect(service.setDistribution("cup", [entry])).resolves.toMatchObject({ prizes: [] });

    expect(diagnostics.errors).toStrictEqual([
      { cause: new Error("Redis down"), message: "Tournament cache invalidation failed" },
    ]);
  });

  it("rejects an unknown tournament before writing", async () => {
    const { service, replaced } = setup({ exists: false });
    await expect(service.setDistribution("cup", [entry])).rejects.toThrow(NotFoundError);
    expect(replaced).toStrictEqual([]);
  });

  it("rejects a team that does not take part in the tournament", async () => {
    const { service, replaced } = setup({ participants: [] });
    await expect(service.setDistribution("cup", [entry])).rejects.toThrow(InvalidInputError);
    expect(replaced).toStrictEqual([]);
  });

  it("rejects a player outside the tournament roster of the team", async () => {
    const { service, replaced } = setup({
      participants: [rosterA, { playerIds: ["player-c"], teamId: "team-b" }],
    });

    await expect(
      service.setDistribution("cup", [{ ...entry, playerIds: ["player-a", "player-c"] }]),
    ).rejects.toThrow(/player-c/u);
    expect(replaced).toStrictEqual([]);
  });

  it("clears a distribution even when the tournament has no participants", async () => {
    const { service, replaced } = setup({ participants: [] });
    await service.setDistribution("cup", []);
    expect(replaced).toStrictEqual([{ entries: [], tournamentId: "cup" }]);
  });

  it("rejects an invalid distribution before writing", async () => {
    const { service, replaced } = setup();
    await expect(service.setDistribution("cup", [{ ...entry, currency: "ABC" }])).rejects.toThrow(
      InvalidInputError,
    );
    expect(replaced).toStrictEqual([]);
  });

  it("returns 404 for an unknown tournament distribution", async () => {
    const { service } = setup({ prizes: null });
    await expect(service.findByTournamentId("missing")).rejects.toThrow(NotFoundError);
  });

  it("only accepts proposals for known tournaments", async () => {
    await expect(setup().service.requireProposableTournament("cup")).resolves.toBeUndefined();
    await expect(
      setup({ known: false }).service.requireProposableTournament("cup"),
    ).rejects.toThrow(NotFoundError);
  });

  it("corrects one row and re-sources it without touching the other rows", async () => {
    const { service, replaced, stored } = setup({
      participants: [rosterA, { playerIds: [], teamId: "team-b" }],
    });

    const other: PrizeEntry = {
      ...entry,
      amount: 500,
      placement: 2,
      playerIds: [],
      teamId: "team-b",
    };

    stored.entries = [entry, other];

    await service.updateEntry("cup", "team-a", { amount: 1800 }, RULES);

    expect(replaced).toStrictEqual([
      {
        entries: [{ ...entry, amount: 1800, sourceUrl: RULES }, other],
        tournamentId: "cup",
      },
    ]);
  });

  it("re-sources a row alone when the patch is empty", async () => {
    const { service, replaced, cache } = setup();

    await service.updateEntry("cup", "team-a", {}, RULES);

    expect(replaced).toStrictEqual([
      { entries: [{ ...entry, sourceUrl: RULES }], tournamentId: "cup" },
    ]);
    expect(cache.invalidated).toStrictEqual(["cup"]);
  });

  it("refuses a correction for a team without a prize row", async () => {
    const { service, replaced } = setup();
    await expect(service.updateEntry("cup", "team-z", {}, RULES)).rejects.toThrow(NotFoundError);
    expect(replaced).toStrictEqual([]);
  });

  it("corrects a row while another row of the stage still cites a refused source", async () => {
    const { service, replaced, stored } = setup({
      participants: [rosterA, { playerIds: [], teamId: "team-b" }],
    });

    const legacy: PrizeEntry = {
      ...entry,
      placement: 2,
      playerIds: [],
      sourceUrl: "https://blast.tv/rl/open",
      teamId: "team-b",
    };

    stored.entries = [entry, legacy];

    await service.updateEntry("cup", "team-a", {}, RULES);

    expect(replaced).toStrictEqual([
      { entries: [{ ...entry, sourceUrl: RULES }, legacy], tournamentId: "cup" },
    ]);
  });

  it("refuses a BLAST.tv source", async () => {
    const { service, replaced } = setup();
    await expect(
      service.updateEntry("cup", "team-a", {}, "https://blast.tv/rl/open"),
    ).rejects.toThrow(InvalidInputError);
    expect(replaced).toStrictEqual([]);
  });
});
