import { Collection, defineEntity, p } from "@mikro-orm/core";
import { v4 } from "uuid";
import { Player, Team } from "../player/player.entities";
import { LeagueRepository } from "./league/league.repository";
import { MatchRepository } from "./match/match.repository";
import { TournamentParticipantRepository } from "./tournament-participant.repository";
import { TournamentRepository } from "./tournament.repository";

export class League {
  id: string = v4();
  pandascoreId!: number;
  name!: string;
  slug: string | null = null;
  url: string | null = null;
  imageUrl: string | null = null;
  modifiedAt: Date | null = null;
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  tournaments = new Collection<Tournament>(this);
}

export class Tournament {
  id: string = v4();
  pandascoreId: number | null = null;
  name!: string;
  description: string | null = null;
  slug: string | null = null;
  serie: string | null = null;
  tier: string | null = null;
  beginAt: Date | null = null;
  endAt: Date | null = null;
  winner: TournamentParticipant | null = null;
  winnerType: string | null = null;
  type: string | null = null;
  prizepool: string | null = null;
  imageUrl: string | null = null;
  league: League | null = null;
  pickemsEnabled = false;
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  matches = new Collection<Match>(this);
  participants = new Collection<TournamentParticipant>(this);
}

export class TournamentParticipant {
  id: string = v4();
  tournament!: Tournament;
  team!: Team;
  players = new Collection<Player>(this);
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
}

export class BracketLink {
  id: string = v4();
  match!: Match;
  previousMatch!: Match;
  type!: "winner" | "loser";
}

export class MatchResult {
  id: string = v4();
  match!: Match;
  participant!: TournamentParticipant;
  score!: number;
}

export class Match {
  id: string = v4();
  pandascoreId: number | null = null;
  name!: string;
  slug: string | null = null;
  beginAt: Date | null = null;
  endAt: Date | null = null;
  status: string | null = null;
  participants = new Collection<TournamentParticipant>(this);
  winner: TournamentParticipant | null = null;
  numberOfGames: number | null = null;
  previousMatches = new Collection<BracketLink>(this);
  results = new Collection<MatchResult>(this);
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  tournament!: Tournament;
}

export const LeagueSchema = defineEntity({
  class: League,
  repository: () => LeagueRepository,
  properties: {
    id: p.string().primary(),
    pandascoreId: p.integer().unique(),
    name: p.string(),
    slug: p.string().nullable(),
    url: p.string().nullable(),
    imageUrl: p.string().nullable(),
    modifiedAt: p.datetime().type("date").nullable(),
    createdAt: p.datetime().type("date"),
    updatedAt: p
      .datetime()
      .type("date")
      .onUpdate(() => new Date()),
    tournaments: p.oneToMany(Tournament).mappedBy("league"),
  },
});

export const TournamentSchema = defineEntity({
  class: Tournament,
  repository: () => TournamentRepository,
  properties: {
    id: p.string().primary(),
    pandascoreId: p.integer().nullable().unique(),
    name: p.string(),
    description: p.string().nullable(),
    slug: p.string().nullable(),
    serie: p.string().nullable(),
    tier: p.string().nullable(),
    beginAt: p.datetime().type("date").nullable(),
    endAt: p.datetime().type("date").nullable(),
    winner: p.manyToOne(TournamentParticipant).nullable(),
    winnerType: p.string().nullable(),
    type: p.string().nullable(),
    prizepool: p.string().nullable(),
    imageUrl: p.string().nullable(),
    league: p.manyToOne(League).nullable(),
    pickemsEnabled: p.boolean().default(false),
    createdAt: p.datetime().type("date"),
    updatedAt: p
      .datetime()
      .type("date")
      .onUpdate(() => new Date()),
    matches: p.oneToMany(Match).mappedBy("tournament"),
    participants: p.oneToMany(TournamentParticipant).mappedBy("tournament"),
  },
});

export const TournamentParticipantSchema = defineEntity({
  class: TournamentParticipant,
  repository: () => TournamentParticipantRepository,
  properties: {
    id: p.string().primary(),
    tournament: p.manyToOne(Tournament),
    team: p.manyToOne(Team),
    players: p.manyToMany(Player),
    createdAt: p.datetime().type("date"),
    updatedAt: p
      .datetime()
      .type("date")
      .onUpdate(() => new Date()),
  },
});

export const MatchSchema = defineEntity({
  class: Match,
  repository: () => MatchRepository,
  properties: {
    id: p.string().primary(),
    pandascoreId: p.integer().nullable().unique(),
    name: p.string(),
    slug: p.string().nullable(),
    beginAt: p.datetime().nullable(),
    endAt: p.datetime().nullable(),
    status: p.string().nullable(),
    participants: p.manyToMany(TournamentParticipant),
    winner: p.manyToOne(TournamentParticipant).nullable(),
    numberOfGames: p.integer().nullable(),
    previousMatches: p.oneToMany(BracketLink).mappedBy("match"),
    results: p.oneToMany(MatchResult).mappedBy("match"),
    createdAt: p.datetime(),
    updatedAt: p.datetime().onUpdate(() => new Date()),
    tournament: p.manyToOne(Tournament),
  },
});

export const BracketLinkSchema = defineEntity({
  class: BracketLink,
  properties: {
    id: p.string().primary(),
    match: p.manyToOne(Match),
    previousMatch: p.manyToOne(Match),
    type: p.string().$type<"winner" | "loser">(),
  },
});

export const MatchResultSchema = defineEntity({
  class: MatchResult,
  uniques: [{ properties: ["match", "participant"] }],
  properties: {
    id: p.string().primary(),
    match: p.manyToOne(Match),
    participant: p.manyToOne(TournamentParticipant),
    score: p.integer(),
  },
});
