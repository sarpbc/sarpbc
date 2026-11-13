import { defineEntity, p } from "@mikro-orm/core";
import { v4 } from "uuid";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import { Match, Tournament } from "../../../tournament/infrastructure/competition-persistence";

export class OnThisDayFact {
  id: string = v4();
  declare month: number;
  declare day: number;
  year: number | null = null;
  declare textEn: string;
  declare textFr: string;
  player: Player | null = null;
  team: Team | null = null;
  tournament: Tournament | null = null;
  match: Match | null = null;
  sourceUrl: string | null = null;
  createdAt = new Date();
  updatedAt = new Date();
}

export const OnThisDayFactSchema = defineEntity({
  class: OnThisDayFact,
  indexes: [
    { properties: ["month", "day"] },
    { properties: ["player"] },
    { properties: ["team"] },
    { properties: ["tournament"] },
    { properties: ["match"] },
  ],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    month: p.smallint(),
    day: p.smallint(),
    year: p.smallint().nullable(),
    textEn: p.text(),
    textFr: p.text(),
    player: p.manyToOne(Player).nullable().deleteRule("set null"),
    team: p.manyToOne(Team).nullable().deleteRule("set null"),
    tournament: p.manyToOne(Tournament).nullable().deleteRule("set null"),
    match: p.manyToOne(Match).nullable().deleteRule("set null"),
    sourceUrl: p.text().nullable(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .defaultRaw("now()")
      .onUpdate(() => new Date()),
  },
});
