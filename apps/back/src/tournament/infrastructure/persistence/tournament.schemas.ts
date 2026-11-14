import { defineEntity, p } from "@mikro-orm/core";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import { MatchRepository } from "./match.repository";
import { TournamentRepository } from "./tournament.repository";
import type { OfficialMatchStream } from "../../domain/official-match-stream";
import type { DataSource, TournamentFormat, MatchVod, Stream, Viewership } from "@sarpbc/types";
import { League } from "./league.entity";
import { TournamentEvent } from "./tournament-event.entity";
import { Tournament } from "./tournament.entity";
import { TournamentParticipant } from "./tournament-participant.entity";
import { BracketLink } from "./bracket-link.entity";
import { MatchResult } from "./match-result.entity";
import { Match } from "./match.entity";

export const LeagueSchema = defineEntity({
  class: League,
  properties: {
    id: p.string().primary(),
    pandascoreId: p.integer().nullable().unique(),
    name: p.string(),
    slug: p.string().nullable(),
    url: p.string().nullable(),
    imageUrl: p.string().nullable(),
    modifiedAt: p.datetime().type("timestamptz").nullable(),
    createdAt: p.datetime().type("timestamptz"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .onUpdate(() => new Date()),
    tournaments: p.oneToMany(Tournament).mappedBy("league"),
  },
});

export const TournamentEventSchema = defineEntity({
  class: TournamentEvent,
  properties: {
    id: p.string().primary(),
    pandascoreSerieId: p.integer().nullable().unique(),
    slug: p.string().unique(),
    name: p.string(),
    league: p.manyToOne(League).nullable(),
    streams: p.json().$type<Stream[]>().default([]),
    viewership: p.json().$type<Viewership>().nullable(),
    createdAt: p.datetime().type("timestamptz"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .onUpdate(() => new Date()),
    stages: p.oneToMany(Tournament).mappedBy("event"),
  },
});

export const TournamentSchema = defineEntity({
  class: Tournament,
  repository: () => TournamentRepository,
  uniques: [{ properties: ["event", "slug"] }],
  properties: {
    id: p.string().primary(),
    pandascoreId: p.integer().nullable().unique(),
    source: p.string().$type<DataSource>().default("pandascore"),
    format: p.string().$type<TournamentFormat>().default("3v3"),
    name: p.string(),
    description: p.string().nullable(),
    slug: p.string(),
    event: p.manyToOne(TournamentEvent),
    tier: p.string().nullable(),
    beginAt: p.datetime().type("timestamptz").nullable(),
    endAt: p.datetime().type("timestamptz").nullable(),
    endAtCorrected: p.boolean().default(false),
    winner: p.manyToOne(TournamentParticipant).nullable(),
    winnerType: p.string().nullable(),
    type: p.string().nullable(),
    country: p.string().nullable(),
    prizepool: p.string().nullable(),
    imageUrl: p.string().nullable(),
    league: p.manyToOne(League).nullable(),
    pickemsEnabled: p.boolean().default(false),
    hasBracket: p.boolean().default(false),
    streams: p.json().$type<Stream[]>().default([]),
    createdAt: p.datetime().type("timestamptz"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .onUpdate(() => new Date()),
    matches: p.oneToMany(Match).mappedBy("tournament"),
    participants: p.oneToMany(TournamentParticipant).mappedBy("tournament"),
  },
});

export const TournamentParticipantSchema = defineEntity({
  class: TournamentParticipant,
  indexes: [{ properties: ["team"] }],
  properties: {
    id: p.string().primary(),
    tournament: p.manyToOne(Tournament),
    team: p.manyToOne(Team).nullable().deleteRule("no action"),
    players: p.manyToMany(Player),
    placement: p.integer().nullable(),
    rosterSourceUrl: p.text().nullable(),
    createdAt: p.datetime().type("timestamptz"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .onUpdate(() => new Date()),
  },
});

export const MatchSchema = defineEntity({
  class: Match,
  repository: () => MatchRepository,
  properties: {
    id: p.string().primary(),
    publicId: p.integer().autoincrement().generated("identity").unique(),
    pandascoreId: p.integer().nullable().unique(),
    source: p.string().$type<DataSource>().default("manual"),
    name: p.string(),
    beginAt: p.datetime().type("timestamptz").nullable(),
    endAt: p.datetime().type("timestamptz").nullable(),
    status: p.string().nullable(),
    participants: p.manyToMany(TournamentParticipant),
    winner: p.manyToOne(TournamentParticipant).nullable(),
    numberOfGames: p.integer().nullable(),
    previousMatches: p.oneToMany(BracketLink).mappedBy("match"),
    results: p.oneToMany(MatchResult).mappedBy("match"),
    officialStreams: p.json().$type<OfficialMatchStream[]>().default([]),
    streams: p.json().$type<Stream[]>().default([]),
    viewership: p.json().$type<Viewership>().nullable(),
    vods: p.json().$type<MatchVod[]>().default([]),
    sourceUrl: p.text().nullable(),
    createdAt: p.datetime().type("timestamptz"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .onUpdate(() => new Date()),
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
