import { Collection } from "@mikro-orm/core";
import { v4 } from "uuid";
import type { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import type { Tournament } from "./tournament.entity";

export class TournamentParticipant {
  id: string = v4();
  tournament!: Tournament;
  team: Team | null = null;
  players = new Collection<Player>(this);
  placement: number | null = null;
  rosterSourceUrl: string | null = null;
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
}
