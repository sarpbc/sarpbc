import { v4 } from "uuid";
import type { TournamentParticipant } from "./tournament-participant.entity";
import type { Match } from "./match.entity";

export class MatchResult {
  id: string = v4();
  match!: Match;
  participant!: TournamentParticipant;
  score!: number;
}
