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
import { RosterProposal } from "../src/roster-proposal/domain/roster-proposal";
import type { RosterProposalStore } from "../src/roster-proposal/application/ports";
import { RosterProposalService } from "../src/roster-proposal/application/roster-proposal.service";
import { replaceStreams } from "../src/tournament/domain/stream";
import type { StreamOwner } from "../src/tournament/domain/stream";
import { requireViewership } from "../src/tournament/domain/viewership";
import type { ViewershipOwner } from "../src/tournament/domain/viewership";

const teamGuard = async (id: string) => {
  if (id === "kc") {
    throw new ConflictError("Karmine Corp still has 3 contracts");
  }
};

const matchGuard = async (id: string) => {
  if (id === "missing-match") {
    throw new NotFoundError("Match not found");
  }

  if (id === "pandascore-match") {
    throw new InvalidInputError("Final is synced from PandaScore and cannot be deleted");
  }
};

const emptyPrizes = { prizepool: null, prizes: [] };

const stored = (key: string) => ({ key, url: `https://cdn.sarpbc.test/${key}` });

const awardError = (tournamentId: string, playerId: string) => {
  if (tournamentId !== "cup") {
    return new NotFoundError(`Tournament with id "${tournamentId}" not found`);
  }

  if (playerId !== "zen") {
    return new InvalidInputError(`${playerId} is not on the roster`);
  }

  return null;
};

type FailureKey =
  | "awards.createForTeam"
  | "awards.requireProposable"
  | "lineups.set"
  | "logos.discard"
  | "logos.upload"
  | "matches.deleteMatch"
  | "players.joinTeam"
  | "store.save"
  | "teams.delete";

export const setupRosterProposalService = () => {
  const saved = new Map<string, RosterProposal>();
  const failures = new Map<FailureKey, Error>();
  let sequence = 0;

  const failNext = (key: FailureKey, error: Error) => {
    failures.set(key, error);
  };

  const throwIfFailing = (key: FailureKey) => {
    const error = failures.get(key);

    if (error) {
      failures.delete(key);

      throw error;
    }
  };

  const store = {
    findById: async (id) => saved.get(id) ?? null,
    list: async (status) => [...saved.values()].filter((p) => p.status === status),
    names: async () => ({ kc: "Karmine Corp", zen: "zen" }),
    save: async (proposal) => {
      throwIfFailing("store.save");

      if (proposal.id === "") {
        sequence += 1;
        proposal.id = `proposal-${sequence}`;
      }

      saved.set(proposal.id, proposal);
    },
  } satisfies RosterProposalStore;

  vi.spyOn(store, "names");

  const zen = Object.assign(new Player(), { id: "zen", name: "zen" });
  const kc = Object.assign(new Team(), { id: "kc", name: "Karmine Corp" });
  const kcCopy = Object.assign(new Team(), { id: "kc-copy", name: "Karmine Corp Esports" });
  const knownTeams = new Map([kc, kcCopy].map((team) => [team.id, team]));
  const mergedPlayers = new Map<string, Player>();

  const players = {
    create: async () => Object.assign(new Player(), { id: "new-player" }),
    findById: async (id: string) =>
      mergedPlayers.get(id) ?? (id === "zen" || id === "zen-dup" ? zen : null),
    joinTeam: async () => {
      throwIfFailing("players.joinTeam");

      return zen;
    },
    leaveTeam: async () => zen,
    update: async () => zen,
  };

  vi.spyOn(players, "create");
  vi.spyOn(players, "joinTeam");

  const teams = {
    create: async () => Object.assign(new Team(), { id: "new-team" }),
    delete: async (id: string) => {
      throwIfFailing("teams.delete");
      await teamGuard(id);
    },
    findById: async (id: string) => knownTeams.get(id) ?? null,
    requireDeletable: teamGuard,
    update: async () => kc,
  };

  vi.spyOn(teams, "delete");
  vi.spyOn(teams, "update");

  const matches = {
    deleteMatch: async (id: string) => {
      throwIfFailing("matches.deleteMatch");
      await matchGuard(id);
    },
    requireProposableDeletion: async (id: string) => {
      await matchGuard(id);
    },
  };

  vi.spyOn(matches, "deleteMatch");

  const viewerships = {
    requireProposable: async (_: ViewershipOwner, input: Viewership) => {
      requireViewership(input);
    },
    set: async (_: ViewershipOwner, input: Viewership | null) => ({
      viewership: input && requireViewership(input),
    }),
  };

  vi.spyOn(viewerships, "set");

  const streams = {
    requireProposable: async (_: StreamOwner, inputs: readonly StreamInput[]) => {
      replaceStreams(inputs);
    },
    set: async (_: StreamOwner, inputs: readonly StreamInput[]) => ({
      inherited: [],
      streams: replaceStreams(inputs),
    }),
  };

  vi.spyOn(streams, "set");

  const lineups = {
    requireProposable: async (_: string, inputs: readonly MatchLineupInput[]) => {
      const playerIds = inputs.flatMap(({ playerIds: ids }) => ids);

      if (new Set(playerIds).size !== playerIds.length) {
        throw new InvalidInputError("A player appears twice in the match lineups");
      }
    },
    set: async () => {
      throwIfFailing("lineups.set");

      return { lineups: [], source: "manual" as const };
    },
  };

  vi.spyOn(lineups, "set");

  const circuits = {
    requireStageSettings: async (
      _: string,
      tournamentId: string,
      input: CircuitStageScaleInput,
    ) => {
      if (tournamentId === "missing-stage") {
        throw new NotFoundError(`Tournament with id "${tournamentId}" was not found.`);
      }

      return { finishes: [], regionTeamIds: [], worldwide: false, ...input };
    },
    setStageScale: async () => {},
  };

  vi.spyOn(circuits, "setStageScale");

  const teamAliases = {
    add: async () => new TeamAlias(),
    requireProposable: async (_teamId: string, input: { sourceUrl: string }) => {
      if (input.sourceUrl.includes("liquipedia")) {
        throw new InvalidInputError("Liquipedia is not an accepted source");
      }
    },
    update: async () => new TeamAlias(),
  };

  vi.spyOn(teamAliases, "add");
  vi.spyOn(teamAliases, "update");

  const seasons = {
    addAward: async () => ({
      awardType: "regional_mvp" as const,
      id: "season-award-1",
      player: { id: "zen", name: "zen", slug: "zen" },
      presentedBy: null,
      region: "Europe",
      sourceUrl: "https://x.com/RLEsports/status/1",
    }),
    requireAward: async (seasonId: string, input: { region?: string | null }) => {
      if (seasonId !== "season-1") {
        throw new NotFoundError("Season not found");
      }

      return {
        awardType: "regional_mvp" as const,
        presentedBy: null,
        region: input.region ?? null,
        sourceUrl: "https://x.com/RLEsports/status/1",
      };
    },
  };

  vi.spyOn(seasons, "addAward");

  const logos = {
    discard: async () => {
      throwIfFailing("logos.discard");
    },
    publish: async (pendingKey: string) => stored(pendingKey.slice("pending/".length)),
    upload: async (teamId: string, variant: string) => {
      throwIfFailing("logos.upload");

      return stored(`pending/teams/${teamId}/logo-${variant}-0123456789abcdef.webp`);
    },
  };

  vi.spyOn(logos, "discard");
  vi.spyOn(logos, "publish");
  vi.spyOn(logos, "upload");

  const contracts = {
    getContractsByPlayer: async () => [Object.assign(new Contract(), { id: "zen-kc" })],
    recordPeriod: async () => Object.assign(new Contract(), { id: "new-contract" }),
    revisePeriod: async () => Object.assign(new Contract(), { id: "zen-kc" }),
  };

  vi.spyOn(contracts, "recordPeriod");
  vi.spyOn(contracts, "revisePeriod");

  const merges = {
    mergePlayers: async () => ({ kept: zen, merged: zen }),
    mergeTeams: async (keptId: string, duplicateId: string) => ({
      kept: knownTeams.get(keptId) ?? kc,
      merged: knownTeams.get(duplicateId) ?? kcCopy,
    }),
  };

  vi.spyOn(merges, "mergeTeams");

  const permissions: string[] = [];
  const staff = { allowed: true, permissions };

  const prizes = {
    requireProposablePrize: async (tournamentId: string, teamId: string) => {
      if (tournamentId !== "cup") {
        throw new NotFoundError(`Tournament "${tournamentId}" not found`);
      }

      if (teamId !== "kc") {
        throw new NotFoundError(`Team "${teamId}" has no prize`);
      }
    },
    requireProposableTournament: async (id: string) => {
      if (id !== "cup") {
        throw new NotFoundError(`Tournament with id "${id}" not found`);
      }
    },
    setDistribution: async () => emptyPrizes,
    updateEntry: async () => emptyPrizes,
  };

  vi.spyOn(prizes, "setDistribution");
  vi.spyOn(prizes, "updateEntry");

  const awards = {
    createForTeam: async () => {
      throwIfFailing("awards.createForTeam");

      return {
        awardType: "mvp" as const,
        id: "award-1",
        participant: { id: "part-kc" },
        player: { id: "zen", name: "zen", slug: "zen" },
      };
    },
    requireProposable: async (tournamentId: string, _team: string, playerId: string) => {
      throwIfFailing("awards.requireProposable");

      const error = awardError(tournamentId, playerId);

      if (error) {
        throw error;
      }
    },
  };

  vi.spyOn(awards, "createForTeam");

  const rollingBack = {
    run: async <T>(work: (proposals: RosterProposalStore) => Promise<T>) => {
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

        for (const [id, proposal] of before) {
          saved.set(id, proposal);
        }

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
    awards,
    circuits,
    contracts,
    failNext,
    lineups,
    logos,
    matches,
    mergedPlayers,
    merges,
    players,
    prizes,
    saved,
    seasons,
    service,
    staff,
    store,
    streams,
    teamAliases,
    teams,
    viewerships,
  };
};
