import { defineEntity, p } from "@mikro-orm/core";
import { AirRiddleRepository } from "../airriddle.repository";

export class AirRiddle {
  id!: string;
  playerId!: string;
  playerName!: string;
  createdAt!: Date;
}

export const AirRiddleSchema = defineEntity({
  class: AirRiddle,
  repository: () => AirRiddleRepository,
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    playerId: p.string(),
    playerName: p.string(),
    createdAt: p.datetime().type("date").defaultRaw("now()"),
  },
});
