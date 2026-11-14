import { v4 } from "uuid";
import type { Tournament } from "../../../tournament/infrastructure/competition-persistence";
import type { SeasonParticipant } from "./season-participant.entity";

export class SeasonPathEntry {
  id: string = v4();
  declare participant: SeasonParticipant;
  declare label: string;
  declare result: string;
  tournament: Tournament | null = null;
  createdAt = new Date();
}
