import { defineEntity, p } from "@mikro-orm/core";
import { PLAYER_AWARD_TYPES } from "@sarpbc/types";
import type { PlayerAwardType } from "@sarpbc/types";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import { Tournament } from "./tournament.entity";
import { TournamentParticipant } from "./tournament-participant.entity";

export class PlayerAward {
  id!: string;
  tournament!: Tournament;
  participant!: TournamentParticipant;
  player!: Player;
  awardType!: PlayerAwardType;
  createdAt = new Date();
}

export const PlayerAwardSchema = defineEntity({
  class: PlayerAward,
  properties: {
    awardType: p.enum([...PLAYER_AWARD_TYPES]).columnType("text"),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    participant: p.manyToOne(TournamentParticipant),
    player: p.manyToOne(Player),
    tournament: p.manyToOne(Tournament),
  },
  uniques: [{ properties: ["tournament", "awardType"] }],
});
