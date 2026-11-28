import type { DataSource, PlayerSeasonAward } from "@sarpbc/types";
import type { PlayerComparisonSources } from "../src/career/application/player-comparison.service";
import { Contract } from "../src/roster/domain/contract";
import { Player } from "../src/roster/domain/player";
import { Team } from "../src/roster/domain/team";
import type { EarningsScope } from "../src/tournament/application/ports";
import { Match } from "../src/tournament/domain/match";
import { Tournament } from "../src/tournament/domain/tournament";
import { TournamentParticipant } from "../src/tournament/domain/tournament-participant";

const cup = { id: "cup", name: "Cup", slug: "cup" };

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

const side = (id: string, team: Team, players: Player[]) =>
  Object.assign(new TournamentParticipant(), { id, players, team });

interface MatchSpec {
  id: string;
  sides: [Player[], Player[]];
  winner: 0 | 1 | null;
  source?: DataSource;
  tournamentSource?: DataSource;
  finished?: boolean;
  playedAt?: string;
}

export const careerMatch = (spec: MatchSpec) => {
  const participants = [
    side(`${spec.id}-kc`, kc, spec.sides[0]),
    side(`${spec.id}-bds`, bds, spec.sides[1]),
  ];

  return Object.assign(new Match(), {
    beginAt: new Date(spec.playedAt ?? "2026-03-01T00:00:00.000Z"),
    id: spec.id,
    participants,
    source: spec.source ?? "manual",
    status: spec.finished === false ? "not_started" : "finished",
    tournament: {
      beginAt: null,
      event: cup,
      eventStreams: [],
      id: `${spec.id}-stage`,
      league: null,
      name: "Main Stage",
      pandascoreId: null,
      pickemsEnabled: false,
      slug: "main-stage",
      source: spec.tournamentSource ?? "manual",
      streams: [],
    },
    winner: spec.winner === null ? null : participants[spec.winner],
  });
};

const careerTitle = (id: string, source: DataSource) =>
  Object.assign(new Tournament(), {
    endAt: new Date("2026-05-01T00:00:00.000Z"),
    event: cup,
    id,
    name: `Title ${id}`,
    slug: id,
    source,
  });

const careerAward = (id: string, source: DataSource) => ({
  awardType: "mvp" as const,
  id,
  tournament: {
    endAt: "2026-05-01T00:00:00.000Z",
    event: cup,
    id: `${id}-stage`,
    name: "Main Stage",
    slug: "main-stage",
    source,
  },
});

export const zenSeasonAward: PlayerSeasonAward = {
  awardType: "season_mvp",
  id: "season-mvp",
  presentedBy: null,
  region: null,
  season: { id: "season-1", name: "2026 Season", slug: null },
  sourceUrl: "https://rocketleague.com/news/season-mvp",
};

export const careerEarnings = (amount: number) => ({
  totals: [{ amount, currency: "USD" }],
  years: [],
});

const careerMatches: Match[] = [
  careerMatch({ id: "final", sides: [[zen], [vatira]], winner: 0 }),
  careerMatch({ id: "rematch", sides: [[zen], [vatira]], source: "pandascore", winner: 1 }),
  careerMatch({ id: "startgg-match", sides: [[zen], [vatira]], source: "startgg", winner: 0 }),
  careerMatch({
    id: "startgg-stage",
    sides: [[vatira], [zen]],
    tournamentSource: "startgg",
    winner: 0,
  }),
  careerMatch({ finished: false, id: "upcoming", sides: [[zen], [mawkzy]], winner: null }),
  careerMatch({ id: "groups", sides: [[zen], [mawkzy]], winner: 0 }),
  careerMatch({ id: "scrim-cup", sides: [[zen, vatira], [mawkzy]], winner: 1 }),
];

export const careerSources = () => {
  const players = [zen, vatira, mawkzy];

  const contract = Object.assign(new Contract(), {
    endDate: null,
    id: "zen-kc",
    player: zen,
    startDate: new Date("2023-01-01T00:00:00.000Z"),
    team: kc,
  });

  const earningsScopes: EarningsScope[] = [];

  const prizes: PlayerComparisonSources["prizes"] = {
    playerEarnings: async (playerId, scope) => {
      earningsScopes.push(scope);

      return careerEarnings(scope.redistributableOnly && playerId === zen.id ? 1500 : 0);
    },
  };

  const sources = {
    awards: {
      findByPlayerId: async (playerId: string) =>
        playerId === zen.id
          ? [careerAward("major-mvp", "pandascore"), careerAward("open-mvp", "startgg")]
          : [],
    },
    contracts: {
      getContractsByPlayer: async (playerId: string) => (playerId === zen.id ? [contract] : []),
    },
    matches: {
      getMatchesByPlayer: async (playerId: string) =>
        careerMatches.filter(({ participants }) =>
          participants.some((participant) => participant.players.some(({ id }) => id === playerId)),
        ),
    },
    players: {
      findBySlug: async (slug: string) => players.find((player) => player.slug === slug) ?? null,
    },
    prizes,
    seasons: {
      awardsOfPlayer: async (playerId: string) => (playerId === zen.id ? [zenSeasonAward] : []),
    },
    tournaments: {
      getTournamentsWonByPlayer: async (playerId: string) =>
        playerId === zen.id
          ? [careerTitle("rlcs", "pandascore"), careerTitle("open", "startgg")]
          : [],
    },
  } satisfies PlayerComparisonSources;

  return { earningsScopes, sources };
};
