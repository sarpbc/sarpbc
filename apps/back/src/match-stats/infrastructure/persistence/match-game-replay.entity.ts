import { Collection } from "@mikro-orm/core";
import type { MatchGame } from "./match-game.entity";
import type { MatchGamePlayer } from "./match-game-player.entity";

export class MatchGameReplay {
  id!: string;
  game!: MatchGame;
  position!: number;
  ballchasingId!: string;
  rocketLeagueId: string | null = null;
  playedAt: Date | null = null;
  blueGoals!: number;
  orangeGoals!: number;
  players = new Collection<MatchGamePlayer>(this);
}
