import type { OfficialMatchStream } from "src/tournament/domain/official-match-stream";

export interface UpsertMatchResultCommand {
  teamPandascoreId: number;
  score: number;
}

export interface UpsertMatchPreviousMatchCommand {
  type: "winner" | "loser";
  matchPandascoreId: number;
}

export interface UpsertMatchCommand {
  pandascoreId: number;
  tournamentPandascoreId: number;
  name: string;
  slug?: string;
  beginAt?: Date;
  endAt?: Date;
  status?: string;
  numberOfGames?: number;
  opponentSlugs: string[];
  results: UpsertMatchResultCommand[];
  previousMatches: UpsertMatchPreviousMatchCommand[];
  officialStreams: OfficialMatchStream[];
}
