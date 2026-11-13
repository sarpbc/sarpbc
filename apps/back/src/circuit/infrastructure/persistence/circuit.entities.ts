import { Collection, defineEntity, p } from "@mikro-orm/core";
import { v4 } from "uuid";
import type { CircuitScaleTier } from "@sarpbc/types";
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
  createdAt = new Date();
  updatedAt = new Date();
}

export const CircuitSchema = defineEntity({
  class: Circuit,
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
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .defaultRaw("now()")
      .onUpdate(() => new Date()),
  },
});
