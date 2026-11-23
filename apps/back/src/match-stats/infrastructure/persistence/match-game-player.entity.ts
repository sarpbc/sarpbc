import type { Player } from "../../../roster/infrastructure/roster-persistence";
import type { Side } from "../../domain/replay-matching";
import type { MatchGameReplay } from "./match-game-replay.entity";

export class MatchGamePlayer {
  id!: string;
  replay!: MatchGameReplay;
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
