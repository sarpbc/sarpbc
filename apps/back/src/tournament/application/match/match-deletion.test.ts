import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, InvalidInputError, NotFoundError } from "../../../common/domain/errors";
import { Match } from "../../domain/competition";
import type { MatchReferences } from "../../domain/match-deletion";
import { CompetitionAfterCommit } from "../after-commit";
import type {
  CompetitionTransaction,
  CompetitionWriteScope,
  MatchQueries,
  MatchWriter,
} from "../ports";
import { MatchService } from "./match.service";

function unused(): never {
  throw new Error("Not part of a match deletion");
}

describe("MatchService deletion", () => {
  let stored: Match | null;
  let references: MatchReferences;
  const removed: string[] = [];
  const invalidated: string[] = [];

  const matches: MatchWriter = {
    load: async () => stored,
    byPandascoreId: unused,
    save: unused,
    timings: unused,
    tournament: unused,
    participants: unused,
    bracket: unused,
    references: async () => references,
    remove: async (id) => {
      removed.push(id);
    },
  };

  const scope: CompetitionWriteScope = {
    matches,
    get tournaments() {
      return unused();
    },
    get events() {
      return unused();
    },
    get rosters() {
      return unused();
    },
    get awards() {
      return unused();
    },
    get prizes() {
      return unused();
    },
    get lineups() {
      return unused();
    },
  };

  const transaction: CompetitionTransaction = { run: async (work) => await work(scope) };

  const reads: MatchQueries = {
    list: vi.fn(),
    page: vi.fn(),
    byIds: vi.fn(),
    recentlyEnded: vi.fn(),
    detail: vi.fn(),
    recentByTeam: vi.fn(),
    betweenTeams: vi.fn(),
    byPlayer: vi.fn(),
    byTeam: vi.fn(),
    byTournament: vi.fn(),
  };

  const service = new MatchService(
    reads,
    transaction,
    new CompetitionAfterCommit(
      {
        invalidateTournament: async (id) => {
          invalidated.push(id);
        },
      },
      { publish: async () => {} },
      { error: () => {} },
    ),
  );

  const match = (fields: Partial<Match> = {}) =>
    Object.assign(new Match(), {
      id: "dup",
      name: "Group A round 1",
      source: "manual",
      tournament: {
        id: "oce-open",
        name: "OCE Open 1",
        slug: "group-a",
        event: { id: "event", slug: "oce-open-1", name: "OCE Open 1" },
        beginAt: null,
        league: null,
        pickemsEnabled: false,
        source: "manual",
        pandascoreId: null,
      },
      ...fields,
    });

  beforeEach(() => {
    stored = match();
    references = { picks: 0, comments: 0, nextMatches: 0 };
    removed.length = 0;
    invalidated.length = 0;
  });

  it("deletes the match and refreshes the standings of its tournament", async () => {
    await service.deleteMatch("dup");

    expect(removed).toEqual(["dup"]);
    expect(invalidated).toEqual(["oce-open"]);
  });

  it("refuses to delete a PandaScore match", async () => {
    stored = match({ source: "pandascore", pandascoreId: 4242 });

    await expect(service.deleteMatch("dup")).rejects.toBeInstanceOf(InvalidInputError);
    await expect(service.requireProposableDeletion("dup")).rejects.toThrow(
      "synced from PandaScore",
    );
    expect(removed).toEqual([]);
    expect(invalidated).toEqual([]);
  });

  it("refuses to delete a match that picks, comments or the bracket still reference", async () => {
    references = { picks: 3, comments: 1, nextMatches: 1 };

    await expect(service.deleteMatch("dup")).rejects.toThrow(
      "3 pick'em picks, 1 comment, 1 bracket match fed by it",
    );
    await expect(service.requireProposableDeletion("dup")).rejects.toBeInstanceOf(ConflictError);
    expect(removed).toEqual([]);
  });

  it("reports a missing match", async () => {
    stored = null;

    await expect(service.deleteMatch("gone")).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.requireProposableDeletion("gone")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lets staff delete a start.gg match but keeps it out of proposals", async () => {
    stored = match({ source: "startgg" });

    await expect(service.requireProposableDeletion("dup")).rejects.toThrow("start.gg");
    await service.deleteMatch("dup");
    expect(removed).toEqual(["dup"]);
  });

  it("checks a proposable deletion without deleting", async () => {
    await service.requireProposableDeletion("dup");

    expect(removed).toEqual([]);
    expect(invalidated).toEqual([]);
  });
});
