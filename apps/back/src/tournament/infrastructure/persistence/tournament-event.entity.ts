import { Collection } from "@mikro-orm/core";
import { v4 } from "uuid";
import type { Stream, Viewership } from "@sarpbc/types";
import type { League } from "./league.entity";
import type { Tournament } from "./tournament.entity";

export class TournamentEvent {
  id: string = v4();
  pandascoreSerieId: number | null = null;
  slug!: string;
  name!: string;
  league: League | null = null;
  streams: Stream[] = [];
  viewership: Viewership | null = null;
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  stages = new Collection<Tournament>(this);
}
