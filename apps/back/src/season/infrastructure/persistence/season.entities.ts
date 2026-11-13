import { defineEntity, p } from "@mikro-orm/core";
import { SEASON_AWARD_TYPES, type SeasonAwardType } from "@sarpbc/types";
import { v4 } from "uuid";
import { Player } from "../../../roster/infrastructure/roster-persistence";

export class Season {
  id: string = v4();
  declare name: string;
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

export const SeasonSchema = defineEntity({
  class: Season,
  properties: {
    id: p.uuid().primary(),
    name: p.string().unique(),
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
