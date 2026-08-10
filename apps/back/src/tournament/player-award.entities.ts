import { defineEntity, p } from "@mikro-orm/core";
import { PlayerAwardType } from "@sarpbc/types";
import { Player } from "../player/player.entities";
import { PlayerAwardRepository } from "./player-award.repository";
import { Tournament, TournamentParticipant } from "./tournament.entities";

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
  repository: () => PlayerAwardRepository,
  // Singleton award types (currently MVP): at most one of each type per tournament.
  uniques: [{ properties: ["tournament", "awardType"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    tournament: p.manyToOne(Tournament),
    participant: p.manyToOne(TournamentParticipant),
    player: p.manyToOne(Player),
    awardType: p.enum(() => PlayerAwardType).columnType("text"),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});
