import { defineEntity, p } from "@mikro-orm/core";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import { Match } from "./match.entity";
import { TournamentParticipant } from "./tournament-participant.entity";

export class MatchLineupPlayer {
  id!: string;
  match!: Match;
  participant!: TournamentParticipant;
  player!: Player;
  position!: number;
}

export const MatchLineupPlayerSchema = defineEntity({
  class: MatchLineupPlayer,
  uniques: [{ properties: ["match", "player"] }],
  indexes: [{ properties: ["player"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    match: p.manyToOne(Match).deleteRule("cascade"),
    participant: p.manyToOne(TournamentParticipant).deleteRule("cascade"),
    player: p.manyToOne(Player).deleteRule("cascade"),
    position: p.integer(),
  },
});
