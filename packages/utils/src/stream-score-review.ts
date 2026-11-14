import type {
  StreamScoreGame,
  StreamScoreProposal,
  StreamScoreSeries,
  StreamScoreSide,
} from "@sarpbc/types";
import { isLiquipediaSourceHost } from "./source-host";

const LOW_CONFIDENCE = 0.9;

export type StreamScoreConfirmBlocker =
  | "no-winner"
  | "unread-game"
  | "unchecked-game"
  | "best-of-mismatch"
  | "forbidden-source";

export interface StreamScoreReview {
  numberOfGames: number | null;
  checkedGames: ReadonlySet<number>;
  bestOfAcknowledged: boolean;
}

export interface StreamScoreSeriesResult {
  participantId: string;
  score: number;
}

export function streamScoreGameNeedsCheck(game: StreamScoreGame): boolean {
  return (
    game.confidence < LOW_CONFIDENCE || game.endedBy === "reset" || game.endedBy === "stream_end"
  );
}

export function streamScoreBestOfMismatch(
  proposal: StreamScoreProposal,
  numberOfGames: number | null,
): boolean {
  return numberOfGames !== null && numberOfGames !== proposal.bestOf;
}

export function isForbiddenStreamScoreSource(source: string): boolean {
  let url: URL;

  try {
    url = new URL(source);
  } catch {
    return false;
  }

  return (
    (url.protocol === "http:" || url.protocol === "https:") && isLiquipediaSourceHost(url.hostname)
  );
}

export function streamScoreConfirmBlockers(
  proposal: StreamScoreProposal,
  review: StreamScoreReview,
): StreamScoreConfirmBlocker[] {
  const blockers: StreamScoreConfirmBlocker[] = [];

  if (proposal.series.winner === null) blockers.push("no-winner");

  if (proposal.games.some((game) => game.winner === null)) blockers.push("unread-game");

  if (
    proposal.games.some(
      (game) =>
        game.winner !== null &&
        streamScoreGameNeedsCheck(game) &&
        !review.checkedGames.has(game.number),
    )
  )
    blockers.push("unchecked-game");

  if (streamScoreBestOfMismatch(proposal, review.numberOfGames) && !review.bestOfAcknowledged)
    blockers.push("best-of-mismatch");

  if (isForbiddenStreamScoreSource(proposal.source)) blockers.push("forbidden-source");

  return blockers;
}

export function streamScoreSeriesResults(
  series: StreamScoreSeries,
  participants: Record<StreamScoreSide, string>,
): StreamScoreSeriesResult[] {
  return [
    { participantId: participants.blue, score: series.blue },
    { participantId: participants.orange, score: series.orange },
  ];
}
