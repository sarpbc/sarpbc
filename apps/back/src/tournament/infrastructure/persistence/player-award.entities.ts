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
  uniques: [{ properties: ["tournament", "awardType"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    tournament: p.manyToOne(Tournament),
    participant: p.manyToOne(TournamentParticipant),
    player: p.manyToOne(Player),
    awardType: p.enum([...PLAYER_AWARD_TYPES]).columnType("text"),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});
