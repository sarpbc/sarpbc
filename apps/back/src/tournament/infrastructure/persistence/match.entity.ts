import { Collection } from "@mikro-orm/core";
import { v4 } from "uuid";
import type { OfficialMatchStream } from "../../domain/official-match-stream";
import type { DataSource, MatchVod, Stream, Viewership } from "@sarpbc/types";
import type { Tournament } from "./tournament.entity";
import type { TournamentParticipant } from "./tournament-participant.entity";
import type { BracketLink } from "./bracket-link.entity";
import type { MatchResult } from "./match-result.entity";

export class Match {
  id: string = v4();
  publicId!: number;
  pandascoreId: number | null = null;
  source: DataSource = "manual";
  name!: string;
  beginAt: Date | null = null;
  endAt: Date | null = null;
  status: string | null = null;
  participants = new Collection<TournamentParticipant>(this);
  winner: TournamentParticipant | null = null;
  numberOfGames: number | null = null;
  previousMatches = new Collection<BracketLink>(this);
  results = new Collection<MatchResult>(this);
  officialStreams: OfficialMatchStream[] = [];
  streams: Stream[] = [];
  viewership: Viewership | null = null;
  vods: MatchVod[] = [];
  sourceUrl: string | null = null;
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  tournament!: Tournament;
}
