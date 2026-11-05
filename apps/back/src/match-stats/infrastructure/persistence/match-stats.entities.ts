import { Collection, defineEntity, p } from "@mikro-orm/core";
import type { StatsImportItem, StatsImportStatus } from "@sarpbc/types";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import {
  Match,
  Tournament,
  TournamentParticipant,
} from "../../../tournament/infrastructure/competition-persistence";
import type { Side } from "../../domain/replay-matching";

export class MatchGame {
  id!: string;
  match!: Match;
  number!: number;
  ballchasingId!: string;
  rocketLeagueId: string | null = null;
  playedAt: Date | null = null;
  blueParticipant!: TournamentParticipant;
  orangeParticipant!: TournamentParticipant;
  blueGoals!: number;
  orangeGoals!: number;
  players = new Collection<MatchGamePlayer>(this);
  createdAt = new Date();
}

export class MatchGamePlayer {
  id!: string;
  game!: MatchGame;
  side!: Side;
  player: Player | null = null;
  name!: string;
  platform!: string;
  platformId: string | null = null;
  goals!: number;
  assists!: number;
  saves!: number;
  shots!: number;
  demolitions!: number;
}

export class PlayerPlatformLink {
  id!: string;
  platform!: string;
  platformId!: string;
  player!: Player;
}

export class MatchStatsImport {
  id!: string;
  tournament!: Tournament;
  groupId!: string;
  status!: StatsImportStatus;
  total: number | null = null;
  processed = 0;
  items: StatsImportItem[] = [];
  error: string | null = null;
  createdAt = new Date();
  startedAt: Date | null = null;
  finishedAt: Date | null = null;
}

export const MatchGameSchema = defineEntity({
  class: MatchGame,
  uniques: [{ properties: ["ballchasingId"] }, { properties: ["match", "number"] }],
  indexes: [{ properties: ["match"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    match: p.manyToOne(Match).deleteRule("cascade"),
    number: p.integer(),
    ballchasingId: p.string(),
    rocketLeagueId: p.string().nullable(),
    playedAt: p.datetime().type("timestamptz").nullable(),
    blueParticipant: p.manyToOne(TournamentParticipant),
    orangeParticipant: p.manyToOne(TournamentParticipant),
    blueGoals: p.integer(),
    orangeGoals: p.integer(),
    players: p.oneToMany(MatchGamePlayer).mappedBy("game"),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});

export const MatchGamePlayerSchema = defineEntity({
  class: MatchGamePlayer,
  indexes: [{ properties: ["game"] }, { properties: ["player"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    game: p.manyToOne(MatchGame).deleteRule("cascade"),
    side: p.text().$type<Side>(),
    player: p.manyToOne(Player).nullable().deleteRule("set null"),
    name: p.text(),
    platform: p.text(),
    platformId: p.text().nullable(),
    goals: p.integer(),
    assists: p.integer(),
    saves: p.integer(),
    shots: p.integer(),
    demolitions: p.integer(),
  },
});

export const PlayerPlatformLinkSchema = defineEntity({
  class: PlayerPlatformLink,
  uniques: [{ properties: ["platform", "platformId"] }],
  indexes: [{ properties: ["player"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    platform: p.text(),
    platformId: p.text(),
    player: p.manyToOne(Player).deleteRule("cascade"),
  },
});

export const MatchStatsImportSchema = defineEntity({
  class: MatchStatsImport,
  indexes: [{ properties: ["tournament", "createdAt"] }],
  properties: {
    id: p.uuid().primary(),
    tournament: p.manyToOne(Tournament).deleteRule("cascade"),
    groupId: p.text(),
    status: p.text().$type<StatsImportStatus>(),
    total: p.integer().nullable(),
    processed: p.integer().default(0),
    items: p.json().$type<StatsImportItem[]>().default([]),
    error: p.text().nullable(),
    createdAt: p.datetime().type("timestamptz"),
    startedAt: p.datetime().type("timestamptz").nullable(),
    finishedAt: p.datetime().type("timestamptz").nullable(),
  },
});
