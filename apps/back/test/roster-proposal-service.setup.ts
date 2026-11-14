import type {
  CircuitStageScaleInput,
  MatchLineupInput,
  StreamInput,
  Viewership,
} from "@sarpbc/types";
import { vi } from "vitest";
import type { PlayerService } from "../src/roster/application/player.service";
import type { TeamService } from "../src/roster/application/team.service";
import type { TeamAliasService } from "../src/roster/application/team-alias.service";
import type { TeamLogoService } from "../src/roster/application/team-logo.service";
import type { ContractService } from "../src/roster/application/contract.service";
import type { RosterMergeService } from "../src/roster/application/roster-merge.service";
import type { MatchService } from "../src/tournament/application/match/match.service";
import type { MatchLineupService } from "../src/tournament/application/match/match-lineup.service";
import type { PlayerAwardService } from "../src/tournament/application/player-award.service";
import type { StreamService } from "../src/tournament/application/stream.service";
import type { ViewershipService } from "../src/tournament/application/viewership.service";
import type { TournamentPrizeService } from "../src/tournament/application/tournament-prize.service";
import type { CircuitService } from "../src/circuit/application/circuit.service";
import type { SeasonService } from "../src/season/application/season.service";
import { ConflictError } from "../src/common/domain/errors/conflict-error";
import { InvalidInputError } from "../src/common/domain/errors/invalid-input-error";
import { NotFoundError } from "../src/common/domain/errors/not-found-error";
import { Contract } from "../src/roster/domain/contract";
import { Player } from "../src/roster/domain/player";
import { Team } from "../src/roster/domain/team";
import { TeamAlias } from "../src/roster/domain/team-alias";
import { replaceStreams } from "../src/tournament/domain/stream";
import type { StreamEditSource, StreamOwner } from "../src/tournament/domain/stream";
import { requireViewership } from "../src/tournament/domain/viewership";
import type { ViewershipOwner } from "../src/tournament/domain/viewership";
import { RosterProposal } from "../src/roster-proposal/domain/roster-proposal";
import type { RosterProposalStore } from "../src/roster-proposal/application/ports";
import { RosterProposalService } from "../src/roster-proposal/application/roster-proposal.service";

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

const stored = (key: string) => ({ key, url: `https://cdn.sarpbc.test/${key}` });

const awardError = (tournamentId: string, playerId: string) => {
  if (tournamentId === "startgg-cup") {
    return new InvalidInputError("Awards of start.gg tournaments cannot be proposed");
  }

  if (tournamentId !== "cup") {
    return new NotFoundError(`Tournament with id "${tournamentId}" not found`);
  }

  if (playerId !== "zen") {
    return new InvalidInputError(`${playerId} is not on the roster`);
  }

  return null;
};

export const setupRosterProposalService = () => {
  const saved = new Map<string, RosterProposal>();
  let sequence = 0;

  const store = {
    findById: async (id) => saved.get(id) ?? null,
    list: async (status) => [...saved.values()].filter((p) => p.status === status),
    names: vi.fn<RosterProposalStore["names"]>(async () => ({ kc: "Karmine Corp", zen: "zen" })),
    save: async (proposal) => {
      if (proposal.id === "") {
        sequence += 1;
        proposal.id = `proposal-${sequence}`;
      }

      saved.set(proposal.id, proposal);
    },
  } satisfies RosterProposalStore;

  const zen = Object.assign(new Player(), { id: "zen", name: "zen" });
  const kc = Object.assign(new Team(), { id: "kc", name: "Karmine Corp" });
  const kcCopy = Object.assign(new Team(), { id: "kc-copy", name: "Karmine Corp Esports" });
  const knownTeams = new Map([kc, kcCopy].map((team) => [team.id, team]));

  const players = {
    create: vi.fn<PlayerService["create"]>(async () =>
      Object.assign(new Player(), { id: "new-player" }),
    ),
    findById: vi.fn<PlayerService["findById"]>(async (id: string) =>
      id === "zen" || id === "zen-dup" ? zen : null,
    ),
    joinTeam: vi.fn<PlayerService["joinTeam"]>(async () => zen),
    leaveTeam: vi.fn<PlayerService["leaveTeam"]>(),
    update: vi.fn<PlayerService["update"]>(async () => zen),
  };

  const teams = {
    create: vi.fn<TeamService["create"]>(async () => Object.assign(new Team(), { id: "new-team" })),
    delete: vi.fn<TeamService["delete"]>(teamGuard),
    findById: vi.fn<TeamService["findById"]>(async (id: string) => knownTeams.get(id) ?? null),
    requireDeletable: vi.fn<TeamService["requireDeletable"]>(teamGuard),
    update: vi.fn<TeamService["update"]>(async () => kc),
  };

  const matches = {
    deleteMatch: vi.fn<MatchService["deleteMatch"]>(matchGuard),
    requireProposableDeletion: vi.fn<MatchService["requireProposableDeletion"]>(
      async (id: string) => {
        await matchGuard(id);

        if (id === "startgg-match") {
          throw new InvalidInputError("Deleting start.gg matches cannot be proposed");
        }
      },
    ),
  };

  const viewerships = {
    requireProposable: vi.fn<ViewershipService["requireProposable"]>(
      async (owner: ViewershipOwner, input: Viewership) => {
        requireViewership(input);

        if (owner.id === "startgg-match") {
          throw new InvalidInputError("The viewership of a start.gg match cannot be proposed");
        }
      },
    ),
    set: vi.fn<ViewershipService["set"]>(async (_: ViewershipOwner, input: Viewership | null) => ({
      viewership: input && requireViewership(input),
    })),
  };

  const streams = {
    requireProposable: vi.fn<StreamService["requireProposable"]>(
      async (owner: StreamOwner, inputs: readonly StreamInput[]) => {
        if (owner.id === "startgg-match") {
          throw new InvalidInputError("Streams of a start.gg match cannot be proposed");
        }

        replaceStreams([], inputs, "manual");
      },
    ),
    set: vi.fn<StreamService["set"]>(
      async (_: StreamOwner, inputs: readonly StreamInput[], from: StreamEditSource) => ({
        inherited: [],
        streams: replaceStreams([], inputs, from),
      }),
    ),
  };

  const lineups = {
    requireProposable: vi.fn<MatchLineupService["requireProposable"]>(
      async (matchId: string, inputs: readonly MatchLineupInput[]) => {
        if (matchId === "startgg-match") {
          throw new InvalidInputError("Lineups of a start.gg match cannot be proposed");
        }

        const playerIds = inputs.flatMap(({ playerIds: ids }) => ids);

        if (new Set(playerIds).size !== playerIds.length) {
          throw new InvalidInputError("A player appears twice in the match lineups");
        }
      },
    ),
    set: vi.fn<MatchLineupService["set"]>(async () => ({ lineups: [], source: "manual" as const })),
  };

  const circuits = {
    requireStageSettings: vi.fn<CircuitService["requireStageSettings"]>(
      async (_: string, tournamentId: string, input: CircuitStageScaleInput) => {
        if (tournamentId === "missing-stage") {
          throw new NotFoundError(`Tournament with id "${tournamentId}" was not found.`);
        }

        return { finishes: [], regionTeamIds: [], worldwide: false, ...input };
      },
    ),
    setStageScale: vi.fn<CircuitService["setStageScale"]>().mockResolvedValue(undefined),
  };

  const teamAliases = {
    add: vi.fn<TeamAliasService["add"]>(async () => new TeamAlias()),
    requireProposable: vi.fn<TeamAliasService["requireProposable"]>(
      async (_teamId: string, input: { sourceUrl: string }) => {
        if (input.sourceUrl.includes("liquipedia")) {
          throw new InvalidInputError("Liquipedia is not an accepted source");
        }
      },
    ),
    update: vi.fn<TeamAliasService["update"]>(async () => new TeamAlias()),
  };

  const seasons = {
    addAward: vi.fn<SeasonService["addAward"]>(async () => ({
      awardType: "regional_mvp" as const,
      id: "season-award-1",
      player: { id: "zen", name: "zen", slug: "zen" },
      presentedBy: null,
      region: "Europe",
      sourceUrl: "https://x.com/RLEsports/status/1",
    })),
    requireAward: vi.fn<SeasonService["requireAward"]>(
      async (seasonId: string, input: { region?: string | null }) => {
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
    ),
  };

  const logos = {
    discard: vi.fn<TeamLogoService["discard"]>().mockResolvedValue(undefined),
    publish: vi.fn<TeamLogoService["publish"]>(async (pendingKey: string) =>
      stored(pendingKey.slice("pending/".length)),
    ),
    upload: vi.fn<TeamLogoService["upload"]>(async (teamId: string, variant: string) =>
      stored(`pending/teams/${teamId}/logo-${variant}-0123456789abcdef.webp`),
    ),
  };

  const contracts = {
    getContractsByPlayer: vi.fn<ContractService["getContractsByPlayer"]>(async () => [
      Object.assign(new Contract(), { id: "zen-kc" }),
    ]),
    recordPeriod: vi.fn<ContractService["recordPeriod"]>(async () =>
      Object.assign(new Contract(), { id: "new-contract" }),
    ),
    revisePeriod: vi.fn<ContractService["revisePeriod"]>(async () =>
      Object.assign(new Contract(), { id: "zen-kc" }),
    ),
  };

  const merges = {
    mergePlayers: vi.fn<RosterMergeService["mergePlayers"]>(),
    mergeTeams: vi.fn<RosterMergeService["mergeTeams"]>(async () => ({ kept: kc, merged: kcCopy })),
  };

  const permissions: string[] = [];
  const staff = { allowed: true, permissions };

  const prizes = {
    requireProposablePrize: vi.fn<TournamentPrizeService["requireProposablePrize"]>(
      async (tournamentId: string, teamId: string) => {
        if (tournamentId !== "cup") {
          throw new NotFoundError(`Tournament "${tournamentId}" not found`);
        }

        if (teamId !== "kc") {
          throw new NotFoundError(`Team "${teamId}" has no prize`);
        }
      },
    ),
    requireProposableTournament: vi.fn<TournamentPrizeService["requireProposableTournament"]>(
      async (id: string) => {
        if (id === "startgg-cup") {
          throw new InvalidInputError(
            "Prize distributions of start.gg tournaments cannot be proposed",
          );
        }

        if (id !== "cup") {
          throw new NotFoundError(`Tournament with id "${id}" not found`);
        }
      },
    ),
    setDistribution: vi.fn<TournamentPrizeService["setDistribution"]>(),
    updateEntry: vi.fn<TournamentPrizeService["updateEntry"]>(),
  };

  const awards = {
    createForTeam: vi.fn<PlayerAwardService["createForTeam"]>(async () => ({
      awardType: "mvp" as const,
      id: "award-1",
      participant: { id: "part-kc" },
      player: { id: "zen", name: "zen", slug: "zen" },
    })),
    requireProposable: vi.fn<PlayerAwardService["requireProposable"]>(
      async (tournamentId: string, _team: string, playerId: string) => {
        const error = awardError(tournamentId, playerId);

        if (error) {
          throw error;
        }
      },
    ),
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
    lineups,
    logos,
    matches,
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
