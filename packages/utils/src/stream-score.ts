import type {
  StreamScoreGame,
  StreamScoreGameEnding,
  StreamScoreProposal,
  StreamScoreSide,
} from "@sarpbc/types";
import { z } from "zod";

const STREAM_SCORE_SIDES = ["blue", "orange"] as const satisfies readonly StreamScoreSide[];

const STREAM_SCORE_GAME_ENDINGS = [
  "regulation",
  "overtime",
  "reset",
  "stream_end",
] as const satisfies readonly StreamScoreGameEnding[];

export type StreamScoreProposalError = "invalid-json" | "invalid-proposal" | "inconsistent-series";

export type ParsedStreamScoreProposal =
  | { ok: true; proposal: StreamScoreProposal }
  | { ok: false; error: StreamScoreProposalError };

const count = z.number().int().min(0);
const seconds = z.number().min(0);

const proposalSchema = z.object({
  overlay: z.string().min(1),
  source: z.string().min(1),
  sourceStartedAt: z.iso.datetime({ offset: true }).nullable(),
  bestOf: z.number().int().min(1).max(9),
  games: z.array(
    z.object({
      number: z.number().int().min(1),
      blue: count,
      orange: count,
      winner: z.enum(STREAM_SCORE_SIDES).nullable(),
      endedBy: z.enum(STREAM_SCORE_GAME_ENDINGS),
      startedAt: seconds,
      endedAt: seconds,
      confidence: z.number().min(0).max(1),
    }),
  ),
  series: z.object({
    blue: count,
    orange: count,
    winner: z.enum(STREAM_SCORE_SIDES).nullable(),
  }),
  frames: z.object({
    read: count,
    accepted: count,
    hidden: count,
    unreadable: count,
    rejected: count,
  }),
});

export const winsNeeded = (bestOf: number): number => Math.floor(bestOf / 2) + 1;

export const gameWinner = (
  game: Pick<StreamScoreGame, "blue" | "orange">,
): StreamScoreSide | null => {
  if (game.blue === game.orange) {
    return null;
  }

  return game.blue > game.orange ? "blue" : "orange";
};

const leadingSide = (blue: number, orange: number, needed: number): StreamScoreSide | null => {
  if (blue >= needed) {
    return "blue";
  }

  return orange >= needed ? "orange" : null;
};

const isConsistent = (proposal: StreamScoreProposal): boolean => {
  const needed = winsNeeded(proposal.bestOf);
  const blue = proposal.games.filter((game) => game.winner === "blue").length;
  const orange = proposal.games.filter((game) => game.winner === "orange").length;
  const seriesWinner = leadingSide(blue, orange, needed);

  return (
    proposal.games.length <= proposal.bestOf &&
    Math.max(blue, orange) <= needed &&
    proposal.games.every(
      (game, index) =>
        game.number === index + 1 &&
        gameWinner(game) === game.winner &&
        game.endedAt >= game.startedAt,
    ) &&
    proposal.series.blue === blue &&
    proposal.series.orange === orange &&
    proposal.series.winner === seriesWinner
  );
};

export const parseStreamScoreProposal = (text: string): ParsedStreamScoreProposal => {
  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid-json" };
  }

  const parsed = proposalSchema.safeParse(json);

  if (!parsed.success) {
    return { ok: false, error: "invalid-proposal" };
  }

  if (!isConsistent(parsed.data)) {
    return { ok: false, error: "inconsistent-series" };
  }

  return { ok: true, proposal: parsed.data };
};
