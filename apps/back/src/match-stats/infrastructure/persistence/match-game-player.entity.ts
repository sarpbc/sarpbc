import type { Player } from "../../../roster/infrastructure/roster-persistence";
import type { Side } from "../../domain/replay-matching";
import type { MatchGame } from "./match-game.entity";

export class MatchGamePlayer {
  id!: string;
  game!: MatchGame;
  side!: Side;
  player: Player | null = null;
  name!: string;
  platform!: string;
  platformId: string | null = null;
  goals!: number;
  assists!: number;
  saves!: number;
  shots!: number;
  demolitions!: number;
}
