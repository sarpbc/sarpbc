import { Collection } from "@mikro-orm/core";
import type {
  Match,
  TournamentParticipant,
} from "../../../tournament/infrastructure/competition-persistence";
import type { MatchGameReplay } from "./match-game-replay.entity";

export class MatchGame {
  id!: string;
  match!: Match;
  number!: number;
  blueParticipant!: TournamentParticipant;
  orangeParticipant!: TournamentParticipant;
  replays = new Collection<MatchGameReplay>(this);
  createdAt = new Date();
}
