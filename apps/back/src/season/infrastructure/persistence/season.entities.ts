import { Collection, defineEntity, p } from "@mikro-orm/core";
import { SEASON_AWARD_TYPES, type SeasonAwardType, type SeasonFormatPhase } from "@sarpbc/types";
import { v4 } from "uuid";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import { Tournament } from "../../../tournament/infrastructure/competition-persistence";

export class Season {
  id: string = v4();
  declare name: string;
  slug: string | null = null;
  formatSummary: string | null = null;
  formatPhases: SeasonFormatPhase[] = [];
  winnerTeam: Team | null = null;
  createdAt = new Date();
  updatedAt = new Date();
}

export class SeasonAward {
  id: string = v4();
  declare season: Season;
  declare player: Player;
  declare awardType: SeasonAwardType;
  region: string | null = null;
  presentedBy: string | null = null;
  declare sourceUrl: string;
  createdAt = new Date();
}

export class SeasonParticipant {
  id: string = v4();
  declare season: Season;
  declare team: Team;
  pathNote: string | null = null;
  path = new Collection<SeasonPathEntry>(this);
  createdAt = new Date();
}

export class SeasonPathEntry {
  id: string = v4();
  declare participant: SeasonParticipant;
  declare label: string;
  declare result: string;
  tournament: Tournament | null = null;
  createdAt = new Date();
}

export const SeasonSchema = defineEntity({
  class: Season,
  properties: {
    id: p.uuid().primary(),
    name: p.string().unique(),
    slug: p.string().nullable().unique(),
    formatSummary: p.text().nullable(),
    formatPhases: p.json().$type<SeasonFormatPhase[]>().default([]),
    winnerTeam: p.manyToOne(Team).nullable().deleteRule("set null"),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .defaultRaw("now()")
      .onUpdate(() => new Date()),
  },
});

export const SeasonAwardSchema = defineEntity({
  class: SeasonAward,
  uniques: [
    {
      name: "season_award_season_id_award_type_region_unique",
      expression:
        'alter table "season_award" add constraint "season_award_season_id_award_type_region_unique" unique nulls not distinct ("season_id", "award_type", "region");',
    },
  ],
  indexes: [{ properties: ["player"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    season: p.manyToOne(Season).deleteRule("cascade"),
    player: p.manyToOne(Player),
    awardType: p.enum([...SEASON_AWARD_TYPES]).columnType("text"),
    region: p.string().nullable(),
    presentedBy: p.string().nullable(),
    sourceUrl: p.text(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});

export const SeasonParticipantSchema = defineEntity({
  class: SeasonParticipant,
  uniques: [{ properties: ["season", "team"] }],
  indexes: [{ properties: ["team"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    season: p.manyToOne(Season).deleteRule("cascade"),
    team: p.manyToOne(Team).deleteRule("cascade"),
    pathNote: p.text().nullable(),
    path: p.oneToMany(SeasonPathEntry).mappedBy("participant"),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});

export const SeasonPathEntrySchema = defineEntity({
  class: SeasonPathEntry,
  indexes: [{ properties: ["participant"] }, { properties: ["tournament"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    participant: p.manyToOne(SeasonParticipant).deleteRule("cascade"),
    label: p.string(),
    result: p.string(),
    tournament: p.manyToOne(Tournament).nullable().deleteRule("set null"),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});
