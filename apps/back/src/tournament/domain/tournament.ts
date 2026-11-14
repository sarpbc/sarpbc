import { v4 } from "uuid";
import type { Stream, TournamentEventRef, DataSource, TournamentFormat } from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import type { League } from "./league";
import type { Match } from "./match";
import { effectiveStreams } from "./stream";
import type { TournamentParticipant } from "./tournament-participant";

export class Tournament {
  id = v4();
  pandascoreId: number | null = null;
  source: DataSource = "pandascore";
  format: TournamentFormat = "3v3";
  name = "";
  description: string | null = null;
  /** Stage slug, unique within its event and frozen once allocated. */
  slug = "";
  event!: TournamentEventRef;
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
  eventStreams: Stream[] = [];
  createdAt = new Date();
  updatedAt = new Date();
  matches: Match[] = [];
  participants: TournamentParticipant[] = [];
  watchStreams(): Stream[] {
    return effectiveStreams(this.streams, this.eventStreams);
  }
  assertDateOrder(): void {
    if (this.beginAt && this.endAt && this.endAt < this.beginAt)
      throw new InvalidInputError("End date must be on or after the start date.");
  }
}
