import { v4 } from "uuid";
import { isMatchFinished, matchSlug, participantName, type NamedParticipant } from "@sarpbc/utils";
import type { MatchVod, Stream, TournamentEventRef, Viewership, DataSource } from "@sarpbc/types";
import type { League } from "./league";
import type { OfficialMatchStream } from "./official-match-stream";
import { effectiveStreams, pandascoreStreams } from "./stream";
import type { TournamentParticipant } from "./tournament-participant";

export interface BracketLink {
  id: string;
  match: { id: string };
  previousMatch: { id: string };
  type: "winner" | "loser";
}

export interface MatchResult {
  id: string;
  match: { id: string };
  participant: { id: string };
  score: number;
}

export interface TournamentSummary {
  id: string;
  name: string;
  slug: string;
  event: TournamentEventRef;
  beginAt: Date | null;
  league: League | null;
  pickemsEnabled: boolean;
  source: DataSource;
  pandascoreId: number | null;
  streams: Stream[];
  eventStreams: Stream[];
}

export class Match {
  id = v4();
  publicId!: number;
  pandascoreId: number | null = null;
  source: DataSource = "manual";
  name = "";
  beginAt: Date | null = null;
  endAt: Date | null = null;
  status: string | null = null;
  participants: TournamentParticipant[] = [];
  winner: TournamentParticipant | null = null;
  numberOfGames: number | null = null;
  previousMatches: BracketLink[] = [];
  results: MatchResult[] = [];
  officialStreams: OfficialMatchStream[] = [];
  streams: Stream[] = [];
  viewership: Viewership | null = null;
  vods: MatchVod[] = [];
  sourceUrl: string | null = null;
  createdAt = new Date();
  updatedAt = new Date();
  tournament!: TournamentSummary;
  hasEnded(): boolean {
    return isMatchFinished(this);
  }
  /** Match lists read `endAt` as the end marker, so a finished match must carry one. */
  stampEnd(at: Date): void {
    if (this.status === "finished") this.endAt ??= at;
  }
  isDecided(): boolean {
    return this.winner !== null && this.hasEnded();
  }
  inheritedStreams(): Stream[] {
    return effectiveStreams(
      pandascoreStreams(this.officialStreams),
      this.tournament.streams,
      this.tournament.eventStreams,
    );
  }
  watchStreams(): Stream[] {
    return effectiveStreams(this.streams, this.inheritedStreams());
  }
}

export interface MatchSlugSource {
  name: string;
  participants: readonly NamedParticipant[];
  tournament: { slug: string; event: { slug: string } };
}

export function matchPublicSlug({ name, participants, tournament }: MatchSlugSource): string {
  const first: NamedParticipant | undefined = participants[0];
  const second: NamedParticipant | undefined = participants[1];

  return matchSlug({
    teamNames: [
      first === undefined ? undefined : participantName(first),
      second === undefined ? undefined : participantName(second),
    ],
    matchName: name,
    eventSlug: tournament.event.slug,
    stageSlug: tournament.slug,
  });
}
