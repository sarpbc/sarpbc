import type { SeasonAwardType } from "@sarpbc/types";
import { v4 } from "uuid";
import type { Player } from "../../../roster/infrastructure/roster-persistence";
import type { Season } from "./season.entity";

export class SeasonAward {
  id: string = v4();
  declare season: Season;
  declare player: Player;
  declare awardType: SeasonAwardType;
  region: string | null = null;
  presentedBy: string | null = null;
  declare sourceUrl: string;
  createdAt = new Date();
}
