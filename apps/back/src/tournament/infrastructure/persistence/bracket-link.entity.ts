import { v4 } from "uuid";
import type { Match } from "./match.entity";

export class BracketLink {
  id: string = v4();
  match!: Match;
  previousMatch!: Match;
  type!: "winner" | "loser";
}
