import { Collection } from "@mikro-orm/core";
import { v4 } from "uuid";
import type { Team } from "../../../roster/infrastructure/roster-persistence";
import type { Season } from "./season.entity";
import type { SeasonPathEntry } from "./season-path-entry.entity";

export class SeasonParticipant {
  id: string = v4();
  declare season: Season;
  declare team: Team;
  pathNote: string | null = null;
  path = new Collection<SeasonPathEntry>(this);
  createdAt = new Date();
}
