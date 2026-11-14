import { Collection } from "@mikro-orm/core";
import { v4 } from "uuid";
import type { CircuitStage } from "./circuit-stage.entity";

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
