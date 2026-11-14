import type {
  CircuitStageScaleInput,
  MatchLineupInput,
  StreamInput,
  Viewership,
} from "@sarpbc/types";
import { vi } from "vitest";
import { ConflictError } from "../src/common/domain/errors/conflict-error";
import { InvalidInputError } from "../src/common/domain/errors/invalid-input-error";
import { NotFoundError } from "../src/common/domain/errors/not-found-error";
import { Contract } from "../src/roster/domain/contract";
import { Player } from "../src/roster/domain/player";
import { Team } from "../src/roster/domain/team";
import { TeamAlias } from "../src/roster/domain/team-alias";
import {
  replaceStreams,
  type StreamEditSource,
  type StreamOwner,
} from "../src/tournament/domain/stream";
import { requireViewership, type ViewershipOwner } from "../src/tournament/domain/viewership";
import { RosterProposal } from "../src/roster-proposal/domain/roster-proposal";
import type { RosterProposalStore } from "../src/roster-proposal/application/ports";
import { RosterProposalService } from "../src/roster-proposal/application/roster-proposal.service";

const teamGuard = async (id: string) => {
  if (id === "kc") throw new ConflictError("Karmine Corp still has 3 contracts");
};

const matchGuard = async (id: string) => {
  if (id === "missing-match") throw new NotFoundError("Match not found");

  if (id === "pandascore-match")
    throw new InvalidInputError("Final is synced from PandaScore and cannot be deleted");
};

const stored = (key: string) => ({ key, url: `https://cdn.sarpbc.test/${key}` });

const awardError = (tournamentId: string, playerId: string) => {
  if (tournamentId === "startgg-cup")
    return new InvalidInputError("Awards of start.gg tournaments cannot be proposed");

  if (tournamentId !== "cup")
    return new NotFoundError(`Tournament with id "${tournamentId}" not found`);

  if (playerId !== "zen") return new InvalidInputError(`${playerId} is not on the roster`);

  return null;
};

export function setupRosterProposalService() {
  const saved = new Map<string, RosterProposal>();
  let sequence = 0;

  const store = {
    findById: async (id) => saved.get(id) ?? null,
    list: async (status) => [...saved.values()].filter((p) => p.status === status),
    save: async (proposal) => {
      if (proposal.id === "") {
        sequence += 1;
        proposal.id = `proposal-${sequence}`;
      }

      saved.set(proposal.id, proposal);
    },
    names: vi.fn(async () => ({ zen: "zen", kc: "Karmine Corp" })),
  } satisfies RosterProposalStore;

  const zen = Object.assign(new Player(), { id: "zen", name: "zen" });
  const kc = Object.assign(new Team(), { id: "kc", name: "Karmine Corp" });
  const kcCopy = Object.assign(new Team(), { id: "kc-copy", name: "Karmine Corp Esports" });
  const knownTeams = new Map([kc, kcCopy].map((team) => [team.id, team]));

  const players = {
    findById: vi.fn(async (id: string) => (id === "zen" || id === "zen-dup" ? zen : null)),
    create: vi.fn(async () => Object.assign(new Player(), { id: "new-player" })),
    update: vi.fn(async () => zen),
    joinTeam: vi.fn(async () => zen),
    leaveTeam: vi.fn(),
  };

  const teams = {
    findById: vi.fn(async (id: string) => knownTeams.get(id) ?? null),
    create: vi.fn(async () => Object.assign(new Team(), { id: "new-team" })),
    update: vi.fn(async () => kc),
    requireDeletable: vi.fn(teamGuard),
    delete: vi.fn(teamGuard),
  };

  const matches = {
    requireProposableDeletion: vi.fn(async (id: string) => {
      await matchGuard(id);

      if (id === "startgg-match")
        throw new InvalidInputError("Deleting start.gg matches cannot be proposed");
    }),
    deleteMatch: vi.fn(matchGuard),
  };

  const viewerships = {
    requireProposable: vi.fn(async (owner: ViewershipOwner, input: Viewership) => {
      requireViewership(input);

      if (owner.id === "startgg-match")
        throw new InvalidInputError("The viewership of a start.gg match cannot be proposed");
    }),
    set: vi.fn(async (_: ViewershipOwner, input: Viewership | null) => ({
      viewership: input && requireViewership(input),
    })),
  };

  const streams = {
    requireProposable: vi.fn(async (owner: StreamOwner, inputs: readonly StreamInput[]) => {
      if (owner.id === "startgg-match")
        throw new InvalidInputError("Streams of a start.gg match cannot be proposed");
      replaceStreams([], inputs, "manual");
    }),
    set: vi.fn(async (_: StreamOwner, inputs: readonly StreamInput[], from: StreamEditSource) => ({
      streams: replaceStreams([], inputs, from),
      inherited: [],
    })),
  };

  const lineups = {
    requireProposable: vi.fn(async (matchId: string, inputs: readonly MatchLineupInput[]) => {
      if (matchId === "startgg-match")
        throw new InvalidInputError("Lineups of a start.gg match cannot be proposed");
      const playerIds = inputs.flatMap(({ playerIds: ids }) => ids);

      if (new Set(playerIds).size !== playerIds.length)
        throw new InvalidInputError("A player appears twice in the match lineups");
    }),
    set: vi.fn(async () => ({ source: "manual" as const, lineups: [] })),
  };

  const circuits = {
    requireStageSettings: vi.fn(
      async (_: string, tournamentId: string, input: CircuitStageScaleInput) => {
        if (tournamentId === "missing-stage")
          throw new NotFoundError(`Tournament with id "${tournamentId}" was not found.`);

        return { worldwide: false, regionTeamIds: [], finishes: [], ...input };
      },
    ),
    setStageScale: vi.fn().mockResolvedValue(undefined),
  };

  const teamAliases = {
    requireProposable: vi.fn(async (_teamId: string, input: { sourceUrl: string }) => {
      if (input.sourceUrl.includes("liquipedia"))
        throw new InvalidInputError("Liquipedia is not an accepted source");
    }),
    add: vi.fn(async () => new TeamAlias()),
    update: vi.fn(async () => new TeamAlias()),
  };

  const seasons = {
    requireAward: vi.fn(async (seasonId: string, input: { region?: string | null }) => {
      if (seasonId !== "season-1") throw new NotFoundError("Season not found");

      return {
        awardType: "regional_mvp" as const,
        region: input.region ?? null,
        presentedBy: null,
        sourceUrl: "https://x.com/RLEsports/status/1",
      };
    }),
    addAward: vi.fn(async () => ({
      id: "season-award-1",
      awardType: "regional_mvp" as const,
      region: "Europe",
      presentedBy: null,
      sourceUrl: "https://x.com/RLEsports/status/1",
      player: { id: "zen", name: "zen", slug: "zen" },
    })),
  };

  const logos = {
    upload: vi.fn(async (teamId: string, variant: string) =>
      stored(`pending/teams/${teamId}/logo-${variant}-0123456789abcdef.webp`),
    ),
    publish: vi.fn(async (pendingKey: string) => stored(pendingKey.slice("pending/".length))),
    discard: vi.fn().mockResolvedValue(undefined),
  };

  const contracts = {
    getContractsByPlayer: vi.fn(async () => [Object.assign(new Contract(), { id: "zen-kc" })]),
    recordPeriod: vi.fn(async () => Object.assign(new Contract(), { id: "new-contract" })),
    revisePeriod: vi.fn(async () => Object.assign(new Contract(), { id: "zen-kc" })),
  };

  const merges = {
    mergePlayers: vi.fn(),
    mergeTeams: vi.fn(async () => ({ kept: kc, merged: kcCopy })),
  };

  const permissions: string[] = [];
  const staff = { allowed: true, permissions };

  const prizes = {
    requireProposableTournament: vi.fn(async (id: string) => {
      if (id === "startgg-cup")
        throw new InvalidInputError(
          "Prize distributions of start.gg tournaments cannot be proposed",
        );

      if (id !== "cup") throw new NotFoundError(`Tournament with id "${id}" not found`);
    }),
    requireProposablePrize: vi.fn(async (tournamentId: string, teamId: string) => {
      if (tournamentId !== "cup") throw new NotFoundError(`Tournament "${tournamentId}" not found`);

      if (teamId !== "kc") throw new NotFoundError(`Team "${teamId}" has no prize`);
    }),
    setDistribution: vi.fn(),
    updateEntry: vi.fn(),
  };

  const awards = {
    requireProposable: vi.fn(async (tournamentId: string, _team: string, playerId: string) => {
      const error = awardError(tournamentId, playerId);

      if (error) throw error;
    }),
    createForTeam: vi.fn(async () => ({
      id: "award-1",
      awardType: "mvp" as const,
      player: { id: "zen", name: "zen", slug: "zen" },
      participant: { id: "part-kc" },
    })),
  };

  const rollingBack = {
    run: async <T>(work: (proposals: RosterProposalStore) => Promise<T>): Promise<T> => {
      const before = new Map(
        [...saved].map(([id, proposal]) => [
          id,
          Object.assign(new RosterProposal(), structuredClone(proposal)),
        ]),
      );

      try {
        return await work(store);
      } catch (error) {
        saved.clear();

        for (const [id, proposal] of before) saved.set(id, proposal);
        throw error;
      }
    },
  };

  const service = new RosterProposalService(
    store,
    rollingBack,
    players,
    teams,
    contracts,
    merges,
    {
      hasAnyPermission: async (_: string, required: string[]) => {
        staff.permissions.push(...required);

        return staff.allowed;
      },
    },
    prizes,
    awards,
    logos,
    matches,
    streams,
    lineups,
    viewerships,
    circuits,
    teamAliases,
    seasons,
  );

  return {
    saved,
    store,
    players,
    teams,
    contracts,
    merges,
    logos,
    staff,
    prizes,
    awards,
    matches,
    streams,
    lineups,
    viewerships,
    circuits,
    teamAliases,
    seasons,
    service,
  };
}
