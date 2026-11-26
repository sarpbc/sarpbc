import { deriveStageWinner } from "../domain/stage-winner";
import type { TournamentWriter } from "./ports";

/** Keeps a stage's stored winner in step with its bracket and prizes; PandaScore stages keep the synced one. */
export const settleStageWinner = async (tournaments: TournamentWriter, tournamentId: string) => {
  const outcome = await tournaments.outcome(tournamentId);

  if (!outcome || outcome.source === "pandascore") {
    return;
  }

  const winnerId = deriveStageWinner(outcome);

  if (winnerId !== outcome.winnerId) {
    await tournaments.setWinner(tournamentId, winnerId);
  }
};
