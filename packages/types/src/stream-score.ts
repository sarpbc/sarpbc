export type StreamScoreSide = "blue" | "orange";

export type StreamScoreGameEnding = "regulation" | "overtime" | "reset" | "stream_end";

export interface StreamScoreGame {
  number: number;
  blue: number;
  orange: number;
  winner: StreamScoreSide | null;
  endedBy: StreamScoreGameEnding;
  startedAt: number;
  endedAt: number;
  confidence: number;
}

export interface StreamScoreSeries {
  blue: number;
  orange: number;
  winner: StreamScoreSide | null;
}

export interface StreamScoreFrameCounts {
  read: number;
  accepted: number;
  hidden: number;
  unreadable: number;
  rejected: number;
}

export interface StreamScoreProposal {
  overlay: string;
  source: string;
  sourceStartedAt: string | null;
  bestOf: number;
  games: StreamScoreGame[];
  series: StreamScoreSeries;
  frames: StreamScoreFrameCounts;
}
