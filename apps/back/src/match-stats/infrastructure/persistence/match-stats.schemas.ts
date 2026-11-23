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
import { MatchGameReplay } from "./match-game-replay.entity";
import { PlayerPlatformLink } from "./player-platform-link.entity";
import { MatchGameExclusion } from "./match-game-exclusion.entity";
import { MatchStatsImport } from "./match-stats-import.entity";

export const MatchGameSchema = defineEntity({
  class: MatchGame,
  indexes: [{ properties: ["match"] }],
  properties: {
    blueParticipant: p.manyToOne(TournamentParticipant),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    match: p.manyToOne(Match).deleteRule("cascade"),
    number: p.integer(),
    orangeParticipant: p.manyToOne(TournamentParticipant),
    replays: p.oneToMany(MatchGameReplay).mappedBy("game"),
  },
  uniques: [{ properties: ["match", "number"] }],
});

export const MatchGameReplaySchema = defineEntity({
  class: MatchGameReplay,
  properties: {
    ballchasingId: p.string(),
    blueGoals: p.integer(),
    game: p.manyToOne(MatchGame).deleteRule("cascade"),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    orangeGoals: p.integer(),
    playedAt: p.datetime().type("timestamptz").nullable(),
    players: p.oneToMany(MatchGamePlayer).mappedBy("replay"),
    position: p.integer(),
    rocketLeagueId: p.string().nullable(),
  },
  uniques: [{ properties: ["ballchasingId"] }, { properties: ["game", "position"] }],
});

export const MatchGamePlayerSchema = defineEntity({
  class: MatchGamePlayer,
  indexes: [{ properties: ["replay"] }, { properties: ["player"] }],
  properties: {
    assists: p.integer(),
    demolitions: p.integer(),
    goals: p.integer(),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    name: p.text(),
    platform: p.text(),
    platformId: p.text().nullable(),
    player: p.manyToOne(Player).nullable().deleteRule("set null"),
    replay: p.manyToOne(MatchGameReplay).deleteRule("cascade"),
    saves: p.integer(),
    shots: p.integer(),
    side: p.text().$type<Side>(),
  },
});

export const PlayerPlatformLinkSchema = defineEntity({
  class: PlayerPlatformLink,
  indexes: [{ properties: ["player"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    platform: p.text(),
    platformId: p.text(),
    player: p.manyToOne(Player).deleteRule("cascade"),
  },
  uniques: [{ properties: ["platform", "platformId"] }],
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
    createdAt: p.datetime().type("timestamptz"),
    error: p.text().nullable(),
    finishedAt: p.datetime().type("timestamptz").nullable(),
    groupId: p.text(),
    id: p.uuid().primary(),
    items: p.json().$type<StatsImportItem[]>().default([]),
    processed: p.integer().default(0),
    startedAt: p.datetime().type("timestamptz").nullable(),
    status: p.text().$type<StatsImportStatus>(),
    total: p.integer().nullable(),
    tournament: p.manyToOne(Tournament).deleteRule("cascade"),
  },
});
