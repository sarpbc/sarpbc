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
    createdAt: p.datetime().type("timestamptz"),
    id: p.string().primary(),
    imageUrl: p.string().nullable(),
    modifiedAt: p.datetime().type("timestamptz").nullable(),
    name: p.string(),
    pandascoreId: p.integer().nullable().unique(),
    slug: p.string().nullable(),
    tournaments: p.oneToMany(Tournament).mappedBy("league"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .onUpdate(() => new Date()),
    url: p.string().nullable(),
  },
});

export const TournamentEventSchema = defineEntity({
  class: TournamentEvent,
  properties: {
    createdAt: p.datetime().type("timestamptz"),
    id: p.string().primary(),
    league: p.manyToOne(League).nullable(),
    name: p.string(),
    pandascoreSerieId: p.integer().nullable().unique(),
    slug: p.string().unique(),
    stages: p.oneToMany(Tournament).mappedBy("event"),
    streams: p.json().$type<Stream[]>().default([]),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .onUpdate(() => new Date()),
    viewership: p.json().$type<Viewership>().nullable(),
  },
});

export const TournamentSchema = defineEntity({
  class: Tournament,
  properties: {
    beginAt: p.datetime().type("timestamptz").nullable(),
    country: p.string().nullable(),
    createdAt: p.datetime().type("timestamptz"),
    description: p.string().nullable(),
    endAt: p.datetime().type("timestamptz").nullable(),
    endAtCorrected: p.boolean().default(false),
    event: p.manyToOne(TournamentEvent),
    format: p.string().$type<TournamentFormat>().default("3v3"),
    hasBracket: p.boolean().default(false),
    id: p.string().primary(),
    imageUrl: p.string().nullable(),
    league: p.manyToOne(League).nullable(),
    matches: p.oneToMany(Match).mappedBy("tournament"),
    name: p.string(),
    pandascoreId: p.integer().nullable().unique(),
    participants: p.oneToMany(TournamentParticipant).mappedBy("tournament"),
    pickemsEnabled: p.boolean().default(false),
    prizepool: p.string().nullable(),
    slug: p.string(),
    source: p.string().$type<DataSource>().default("pandascore"),
    streams: p.json().$type<Stream[]>().default([]),
    tier: p.string().nullable(),
    type: p.string().nullable(),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .onUpdate(() => new Date()),
    winner: p.manyToOne(TournamentParticipant).nullable(),
    winnerType: p.string().nullable(),
  },
  repository: () => TournamentRepository,
  uniques: [{ properties: ["event", "slug"] }],
});

export const TournamentParticipantSchema = defineEntity({
  class: TournamentParticipant,
  indexes: [{ properties: ["team"] }],
  properties: {
    createdAt: p.datetime().type("timestamptz"),
    id: p.string().primary(),
    placement: p.integer().nullable(),
    players: p.manyToMany(Player),
    rosterSourceUrl: p.text().nullable(),
    team: p.manyToOne(Team).nullable().deleteRule("no action"),
    tournament: p.manyToOne(Tournament),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .onUpdate(() => new Date()),
  },
});

export const MatchSchema = defineEntity({
  class: Match,
  properties: {
    beginAt: p.datetime().type("timestamptz").nullable(),
    createdAt: p.datetime().type("timestamptz"),
    endAt: p.datetime().type("timestamptz").nullable(),
    id: p.string().primary(),
    name: p.string(),
    numberOfGames: p.integer().nullable(),
    officialStreams: p.json().$type<OfficialMatchStream[]>().default([]),
    pandascoreId: p.integer().nullable().unique(),
    participants: p.manyToMany(TournamentParticipant),
    previousMatches: p.oneToMany(BracketLink).mappedBy("match"),
    publicId: p.integer().autoincrement().generated("identity").unique(),
    results: p.oneToMany(MatchResult).mappedBy("match"),
    source: p.string().$type<DataSource>().default("manual"),
    sourceUrl: p.text().nullable(),
    status: p.string().nullable(),
    streams: p.json().$type<Stream[]>().default([]),
    tournament: p.manyToOne(Tournament),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .onUpdate(() => new Date()),
    viewership: p.json().$type<Viewership>().nullable(),
    vods: p.json().$type<MatchVod[]>().default([]),
    winner: p.manyToOne(TournamentParticipant).nullable(),
  },
  repository: () => MatchRepository,
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
  properties: {
    id: p.string().primary(),
    match: p.manyToOne(Match),
    participant: p.manyToOne(TournamentParticipant),
    score: p.integer(),
  },
  uniques: [{ properties: ["match", "participant"] }],
});
