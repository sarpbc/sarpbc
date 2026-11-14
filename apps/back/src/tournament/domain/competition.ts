import { v4 } from "uuid";
import { isMatchFinished, matchSlug, participantName, type NamedParticipant } from "@sarpbc/utils";
import type { MatchVod, Stream, TournamentEventRef, Viewership } from "@sarpbc/types";
import type { Player, Team } from "../../roster/domain/roster";
import type { OfficialMatchStream } from "./official-match-stream";
import { effectiveStreams, pandascoreStreams } from "./stream";
import type { DataSource, TournamentFormat } from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors";

export class League {
  id = v4();
  pandascoreId: number | null = null;
  name = "";
  slug: string | null = null;
  url: string | null = null;
  imageUrl: string | null = null;
  modifiedAt: Date | null = null;
  createdAt = new Date();
  updatedAt = new Date();
}

export class TournamentParticipant {
  id = v4();
  tournamentId = "";
  team: Team | null = null;
  players: Player[] = [];
  rosterSourceUrl: string | null = null;
  createdAt = new Date();
  updatedAt = new Date();
}

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
  participants: ReadonlyArray<NamedParticipant>;
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

export interface ParticipantSnapshot {
  id: string;
  tournamentId: string;
  teamId: string | null;
  playerIds: string[];
  rosterSourceUrl: string | null;
}

export interface ParticipantReferences {
  tournamentWinner: boolean;
  matchParticipant: boolean;
  matchWinner: boolean;
  results: boolean;
}

export function assertParticipantRemovable(refs: ParticipantReferences): void {
  if (refs.tournamentWinner)
    throw new InvalidInputError(
      "Cannot remove a participant that is the tournament winner. Clear the winner first.",
    );

  if (refs.matchParticipant)
    throw new InvalidInputError(
      "Cannot remove a participant that already appears in matches. Remove or reassign those matches first.",
    );

  if (refs.matchWinner)
    throw new InvalidInputError(
      "Cannot remove a participant that is recorded as a match winner. Clear those winners first.",
    );

  if (refs.results)
    throw new InvalidInputError(
      "Cannot remove a participant that has match results. Remove those results first.",
    );
}
