import { Collection } from "@mikro-orm/core";
import { v4 } from "uuid";
import type { DataSource, TournamentFormat, Stream } from "@sarpbc/types";
import type { League } from "./league.entity";
import type { TournamentEvent } from "./tournament-event.entity";
import type { TournamentParticipant } from "./tournament-participant.entity";
import type { Match } from "./match.entity";

export class Tournament {
  id: string = v4();
  pandascoreId: number | null = null;
  source: DataSource = "pandascore";
  format: TournamentFormat = "3v3";
  name!: string;
  description: string | null = null;
  slug!: string;
  event!: TournamentEvent;
  tier: string | null = null;
  beginAt: Date | null = null;
  endAt: Date | null = null;
  endAtCorrected = false;
  winner: TournamentParticipant | null = null;
  winnerType: string | null = null;
  type: string | null = null;
  country: string | null = null;
  prizepool: string | null = null;
  imageUrl: string | null = null;
  league: League | null = null;
  pickemsEnabled = false;
  hasBracket = false;
  streams: Stream[] = [];
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  matches = new Collection<Match>(this);
  participants = new Collection<TournamentParticipant>(this);
}
