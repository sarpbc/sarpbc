import { Collection } from "@mikro-orm/core";
import { v4 } from "uuid";
import type { CircuitScaleTier } from "@sarpbc/types";
import type { Tournament } from "../../../tournament/infrastructure/competition-persistence";
import type { Circuit } from "./circuit.entity";
import type { CircuitStageTeam } from "./circuit-stage-team.entity";

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
