import { defineEntity, p } from "@mikro-orm/core";

export class AirRiddle {
  id!: string;
  playerId!: string;
  playerName!: string;
  createdAt!: Date;
}

export const AirRiddleSchema = defineEntity({
  class: AirRiddle,
  properties: {
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    playerId: p.string(),
    playerName: p.string(),
  },
});
