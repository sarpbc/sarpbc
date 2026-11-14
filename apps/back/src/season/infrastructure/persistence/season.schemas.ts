import { defineEntity, p } from "@mikro-orm/core";
import { SEASON_AWARD_TYPES } from "@sarpbc/types";
import type { SeasonFormatPhase } from "@sarpbc/types";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import { Tournament } from "../../../tournament/infrastructure/competition-persistence";
import { Season } from "./season.entity";
import { SeasonAward } from "./season-award.entity";
import { SeasonParticipant } from "./season-participant.entity";
import { SeasonPathEntry } from "./season-path-entry.entity";

export const SeasonSchema = defineEntity({
  class: Season,
  properties: {
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    formatPhases: p.json().$type<SeasonFormatPhase[]>().default([]),
    formatSummary: p.text().nullable(),
    id: p.uuid().primary(),
    name: p.string().unique(),
    slug: p.string().nullable().unique(),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .defaultRaw("now()")
      .onUpdate(() => new Date()),
    winnerTeam: p.manyToOne(Team).nullable().deleteRule("set null"),
  },
});

export const SeasonAwardSchema = defineEntity({
  class: SeasonAward,
  indexes: [{ properties: ["player"] }],
  properties: {
    awardType: p.enum([...SEASON_AWARD_TYPES]).columnType("text"),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    player: p.manyToOne(Player),
    presentedBy: p.string().nullable(),
    region: p.string().nullable(),
    season: p.manyToOne(Season).deleteRule("cascade"),
    sourceUrl: p.text(),
  },
  uniques: [
    {
      expression:
        'alter table "season_award" add constraint "season_award_season_id_award_type_region_unique" unique nulls not distinct ("season_id", "award_type", "region");',
      name: "season_award_season_id_award_type_region_unique",
    },
  ],
});

export const SeasonParticipantSchema = defineEntity({
  class: SeasonParticipant,
  indexes: [{ properties: ["team"] }],
  properties: {
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    path: p.oneToMany(SeasonPathEntry).mappedBy("participant"),
    pathNote: p.text().nullable(),
    season: p.manyToOne(Season).deleteRule("cascade"),
    team: p.manyToOne(Team).deleteRule("cascade"),
  },
  uniques: [{ properties: ["season", "team"] }],
});

export const SeasonPathEntrySchema = defineEntity({
  class: SeasonPathEntry,
  indexes: [{ properties: ["participant"] }, { properties: ["tournament"] }],
  properties: {
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    label: p.string(),
    participant: p.manyToOne(SeasonParticipant).deleteRule("cascade"),
    result: p.string(),
    tournament: p.manyToOne(Tournament).nullable().deleteRule("set null"),
  },
});
