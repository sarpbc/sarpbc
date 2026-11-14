import type {
  DataSource,
  PlayerProfileAward,
  PlayerSeasonAward,
  ProfileEarnings,
} from "@sarpbc/types";
import { vi } from "vitest";
import type { PlayerComparisonSources } from "../src/career/application/player-comparison.service";
import type { EarningsScope } from "../src/tournament/application/ports";
import { Contract, Player, Team } from "../src/roster/domain/roster";
import { Match, Tournament, TournamentParticipant } from "../src/tournament/domain/competition";

const cup = { id: "cup", slug: "cup", name: "Cup" };

export const kc = Object.assign(new Team(), {
  id: "kc",
  name: "Karmine Corp",
  slug: "karmine-corp",
});

export const bds = Object.assign(new Team(), { id: "bds", name: "Team BDS", slug: "team-bds" });
export const zen = Object.assign(new Player(), { id: "zen", name: "zen", slug: "zen", team: kc });

export const vatira = Object.assign(new Player(), {
  id: "vatira",
  name: "Vatira",
  slug: "vatira",
  team: kc,
});

export const mawkzy = Object.assign(new Player(), { id: "mawkzy", name: "M0nkey", slug: "m0nkey" });

function side(id: string, team: Team, players: Player[]): TournamentParticipant {
  return Object.assign(new TournamentParticipant(), { id, team, players });
}

interface MatchSpec {
  id: string;
  sides: [Player[], Player[]];
  winner: 0 | 1 | null;
  source?: DataSource;
  tournamentSource?: DataSource;
  finished?: boolean;
}

export function careerMatch(spec: MatchSpec): Match {
  const participants = [
    side(`${spec.id}-kc`, kc, spec.sides[0]),
    side(`${spec.id}-bds`, bds, spec.sides[1]),
  ];

  return Object.assign(new Match(), {
    id: spec.id,
    source: spec.source ?? "manual",
    status: spec.finished === false ? "not_started" : "finished",
    participants,
    winner: spec.winner === null ? null : participants[spec.winner],
    tournament: {
      id: `${spec.id}-stage`,
      name: "Main Stage",
      slug: "main-stage",
      event: cup,
      beginAt: null,
      league: null,
      pickemsEnabled: false,
      source: spec.tournamentSource ?? "manual",
      pandascoreId: null,
      streams: [],
      eventStreams: [],
    },
  });
}

export function careerTitle(id: string, source: DataSource): Tournament {
  return Object.assign(new Tournament(), {
    id,
    name: `Title ${id}`,
    slug: id,
    source,
    event: cup,
    endAt: new Date("2026-05-01T00:00:00.000Z"),
  });
}

export function careerAward(id: string, source: DataSource): PlayerProfileAward {
  return {
    id,
    awardType: "mvp",
    tournament: {
      id: `${id}-stage`,
      name: "Main Stage",
      slug: "main-stage",
      source,
      endAt: null,
      event: cup,
    },
  };
}

export const zenSeasonAward: PlayerSeasonAward = {
  id: "season-mvp",
  awardType: "season_mvp",
  region: null,
  presentedBy: null,
  sourceUrl: "https://rocketleague.com/news/season-mvp",
  season: { id: "season-1", name: "2026 Season", slug: null },
};

export function careerEarnings(amount: number): ProfileEarnings {
  return { totals: [{ currency: "USD", amount }], years: [] };
}

export const careerMatches: Match[] = [
  careerMatch({ id: "final", sides: [[zen], [vatira]], winner: 0 }),
  careerMatch({ id: "rematch", sides: [[zen], [vatira]], winner: 1, source: "pandascore" }),
  careerMatch({ id: "startgg-match", sides: [[zen], [vatira]], winner: 0, source: "startgg" }),
  careerMatch({
    id: "startgg-stage",
    sides: [[vatira], [zen]],
    winner: 0,
    tournamentSource: "startgg",
  }),
  careerMatch({ id: "upcoming", sides: [[zen], [mawkzy]], winner: null, finished: false }),
  careerMatch({ id: "groups", sides: [[zen], [mawkzy]], winner: 0 }),
  careerMatch({ id: "scrim-cup", sides: [[zen, vatira], [mawkzy]], winner: 1 }),
];

export function careerSources() {
  const players = [zen, vatira, mawkzy];

  const contract = Object.assign(new Contract(), {
    id: "zen-kc",
    player: zen,
    team: kc,
    startDate: new Date("2023-01-01T00:00:00.000Z"),
    endDate: null,
  });

  const playerEarnings = vi.fn(
    async (playerId: string, scope: EarningsScope): Promise<ProfileEarnings> =>
      careerEarnings(scope.redistributableOnly && playerId === zen.id ? 1500 : 0),
  );

  const sources = {
    players: {
      findBySlug: async (slug: string) => players.find((player) => player.slug === slug) ?? null,
    },
    contracts: {
      getContractsByPlayer: async (playerId: string) => (playerId === zen.id ? [contract] : []),
    },
    tournaments: {
      getTournamentsWonByPlayer: async (playerId: string) =>
        playerId === zen.id
          ? [careerTitle("rlcs", "pandascore"), careerTitle("open", "startgg")]
          : [],
    },
    matches: {
      getMatchesByPlayer: async (playerId: string) =>
        careerMatches.filter(({ participants }) =>
          participants.some((participant) => participant.players.some(({ id }) => id === playerId)),
        ),
    },
    prizes: { playerEarnings },
    awards: {
      findByPlayerId: async (playerId: string) =>
        playerId === zen.id
          ? [careerAward("major-mvp", "pandascore"), careerAward("open-mvp", "startgg")]
          : [],
    },
    seasons: {
      awardsOfPlayer: async (playerId: string) => (playerId === zen.id ? [zenSeasonAward] : []),
    },
  } satisfies PlayerComparisonSources;

  return { sources, playerEarnings };
}
