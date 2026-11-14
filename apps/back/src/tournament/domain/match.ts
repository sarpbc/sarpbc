import { v4 } from "uuid";
import { isMatchFinished, matchSlug, participantName, winsNeeded } from "@sarpbc/utils";
import type { NamedParticipant } from "@sarpbc/utils";
import type { MatchVod, Stream, TournamentEventRef, Viewership, DataSource } from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
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
  forfeitedBy: TournamentParticipant | null = null;
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
    if (this.status === "finished") {
      this.endAt ??= at;
    }
  }
  /** The opponent wins by the series default score; an unknown series length keeps the score. */
  declareForfeit(forfeiter: TournamentParticipant): void {
    if (this.participants.length !== 2) {
      throw new InvalidInputError("Only a match between two participants can be forfeited");
    }

    const opponent = this.participants.find((p) => p.id !== forfeiter.id);

    if (opponent === undefined || !this.participants.some((p) => p.id === forfeiter.id)) {
      throw new InvalidInputError("The forfeiting side must be a participant in this match");
    }

    this.forfeitedBy = forfeiter;
    this.winner = opponent;
    this.status = "finished";
    this.stampEnd(new Date());

    if (this.numberOfGames !== null && this.numberOfGames > 0) {
      const wins = winsNeeded(this.numberOfGames);
      this.results = [
        { score: wins, side: opponent },
        { score: 0, side: forfeiter },
      ].map(({ score, side }) => ({
        id: v4(),
        match: { id: this.id },
        participant: { id: side.id },
        score,
      }));
    }
  }
  clearForfeit(): void {
    this.forfeitedBy = null;
  }
  /** Called before every save: a forfeit only stands in a finished two-sided match the other side won. */
  dropBrokenForfeit(): void {
    const forfeiter = this.forfeitedBy;

    if (forfeiter === null) {
      return;
    }

    const ids = this.participants.map((p) => p.id);

    const stands =
      ids.length === 2 &&
      ids.includes(forfeiter.id) &&
      this.winner !== null &&
      this.winner.id !== forfeiter.id &&
      ids.includes(this.winner.id) &&
      this.status === "finished";

    if (!stands) {
      this.forfeitedBy = null;
    }
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

export const matchPublicSlug = ({ name, participants, tournament }: MatchSlugSource): string => {
  const first: NamedParticipant | undefined = participants[0];
  const second: NamedParticipant | undefined = participants[1];

  return matchSlug({
    eventSlug: tournament.event.slug,
    matchName: name,
    stageSlug: tournament.slug,
    teamNames: [
      first === undefined ? undefined : participantName(first),
      second === undefined ? undefined : participantName(second),
    ],
  });
};
