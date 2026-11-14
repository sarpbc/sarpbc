import { defineEntity, p } from "@mikro-orm/core";
import type { CircuitScaleTier } from "@sarpbc/types";
import { Team } from "../../../roster/infrastructure/roster-persistence";
import { Tournament } from "../../../tournament/infrastructure/competition-persistence";
import { Circuit } from "./circuit.entity";
import { CircuitStage } from "./circuit-stage.entity";
import { CircuitStageTeam } from "./circuit-stage-team.entity";

export const CircuitSchema = defineEntity({
  class: Circuit,
  properties: {
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    description: p.text().nullable(),
    id: p.uuid().primary(),
    name: p.string(),
    qualificationSpots: p.integer().nullable(),
    region: p.string().nullable(),
    season: p.integer().nullable(),
    slug: p.string().unique(),
    sourceUrl: p.text().nullable(),
    stages: p.oneToMany(CircuitStage).mappedBy("circuit"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .defaultRaw("now()")
      .onUpdate(() => new Date()),
  },
  uniques: [
    {
      expression:
        'create unique index "circuit_identity_unique" on "circuit" (lower("name"), "season", lower("region")) nulls not distinct;',
      name: "circuit_identity_unique",
    },
  ],
});

export const CircuitStageSchema = defineEntity({
  class: CircuitStage,
  indexes: [{ properties: ["tournament"] }],
  properties: {
    circuit: p.manyToOne(Circuit).deleteRule("cascade"),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    scale: p.json().$type<CircuitScaleTier[]>().default([]),
    sourceUrl: p.text(),
    teams: p.oneToMany(CircuitStageTeam).mappedBy("stage"),
    tournament: p.manyToOne(Tournament).deleteRule("cascade"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .defaultRaw("now()")
      .onUpdate(() => new Date()),
    worldwide: p.boolean().default(false),
  },
  uniques: [{ properties: ["circuit", "tournament"] }],
});

export const CircuitStageTeamSchema = defineEntity({
  class: CircuitStageTeam,
  indexes: [{ properties: ["team"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    placement: p.integer().nullable(),
    regionMember: p.boolean().default(false),
    stage: p.manyToOne(CircuitStage).deleteRule("cascade"),
    team: p.manyToOne(Team).deleteRule("cascade"),
  },
  uniques: [{ properties: ["stage", "team"] }],
});
