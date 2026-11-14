import { Collection } from "@mikro-orm/core";
import type {
  Match,
  TournamentParticipant,
} from "../../../tournament/infrastructure/competition-persistence";
import type { MatchGamePlayer } from "./match-game-player.entity";

export class MatchGame {
  id!: string;
  match!: Match;
  number!: number;
  ballchasingId!: string;
  rocketLeagueId: string | null = null;
  playedAt: Date | null = null;
  blueParticipant!: TournamentParticipant;
  orangeParticipant!: TournamentParticipant;
  blueGoals!: number;
  orangeGoals!: number;
  players = new Collection<MatchGamePlayer>(this);
  createdAt = new Date();
}
