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
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    day: p.smallint(),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    match: p.manyToOne(Match).nullable().deleteRule("set null"),
    month: p.smallint(),
    player: p.manyToOne(Player).nullable().deleteRule("set null"),
    sourceUrl: p.text().nullable(),
    team: p.manyToOne(Team).nullable().deleteRule("set null"),
    textEn: p.text(),
    textFr: p.text(),
    tournament: p.manyToOne(Tournament).nullable().deleteRule("set null"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .defaultRaw("now()")
      .onUpdate(() => new Date()),
    year: p.smallint().nullable(),
  },
});
