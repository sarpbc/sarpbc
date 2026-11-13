import { Collection, defineEntity, p } from "@mikro-orm/core";
import { v4 } from "uuid";
import type { CircuitScaleTier } from "@sarpbc/types";
import { Team } from "../../../roster/infrastructure/roster-persistence";
import { Tournament } from "../../../tournament/infrastructure/competition-persistence";

export class Circuit {
  id: string = v4();
  declare slug: string;
  declare name: string;
  season: number | null = null;
  region: string | null = null;
  description: string | null = null;
  sourceUrl: string | null = null;
  qualificationSpots: number | null = null;
  createdAt = new Date();
  updatedAt = new Date();
  stages = new Collection<CircuitStage>(this);
}

export class CircuitStage {
  id: string = v4();
  declare circuit: Circuit;
  declare tournament: Tournament;
  scale: CircuitScaleTier[] = [];
  declare sourceUrl: string;
  worldwide = false;
  createdAt = new Date();
  updatedAt = new Date();
  teams = new Collection<CircuitStageTeam>(this);
}

export class CircuitStageTeam {
  id: string = v4();
  declare stage: CircuitStage;
  declare team: Team;
  placement: number | null = null;
  regionMember = false;
}

export const CircuitSchema = defineEntity({
  class: Circuit,
  uniques: [
    {
      name: "circuit_identity_unique",
      expression:
        'create unique index "circuit_identity_unique" on "circuit" (lower("name"), "season", lower("region")) nulls not distinct;',
    },
  ],
  properties: {
    id: p.uuid().primary(),
    slug: p.string().unique(),
    name: p.string(),
    season: p.integer().nullable(),
    region: p.string().nullable(),
    description: p.text().nullable(),
    sourceUrl: p.text().nullable(),
    qualificationSpots: p.integer().nullable(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .defaultRaw("now()")
      .onUpdate(() => new Date()),
    stages: p.oneToMany(CircuitStage).mappedBy("circuit"),
  },
});

export const CircuitStageSchema = defineEntity({
  class: CircuitStage,
  uniques: [{ properties: ["circuit", "tournament"] }],
  indexes: [{ properties: ["tournament"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    circuit: p.manyToOne(Circuit).deleteRule("cascade"),
    tournament: p.manyToOne(Tournament).deleteRule("cascade"),
    scale: p.json().$type<CircuitScaleTier[]>().default([]),
    sourceUrl: p.text(),
    worldwide: p.boolean().default(false),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .defaultRaw("now()")
      .onUpdate(() => new Date()),
    teams: p.oneToMany(CircuitStageTeam).mappedBy("stage"),
  },
});

export const CircuitStageTeamSchema = defineEntity({
  class: CircuitStageTeam,
  uniques: [{ properties: ["stage", "team"] }],
  indexes: [{ properties: ["team"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    stage: p.manyToOne(CircuitStage).deleteRule("cascade"),
    team: p.manyToOne(Team).deleteRule("cascade"),
    placement: p.integer().nullable(),
    regionMember: p.boolean().default(false),
  },
});
