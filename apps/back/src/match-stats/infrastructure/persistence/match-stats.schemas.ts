import { defineEntity, p } from "@mikro-orm/core";
import type { StatsImportItem, StatsImportStatus } from "@sarpbc/types";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import {
  Match,
  Tournament,
  TournamentParticipant,
} from "../../../tournament/infrastructure/competition-persistence";
import type { Side } from "../../domain/replay-matching";
import { MatchGame } from "./match-game.entity";
import { MatchGamePlayer } from "./match-game-player.entity";
import { PlayerPlatformLink } from "./player-platform-link.entity";
import { MatchGameExclusion } from "./match-game-exclusion.entity";
import { MatchStatsImport } from "./match-stats-import.entity";

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

export const MatchGameExclusionSchema = defineEntity({
  class: MatchGameExclusion,
  properties: {
    ballchasingId: p.text().primary(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
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
