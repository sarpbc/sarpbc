import { describe, expect, it } from "vitest";
import type { StageOutcome } from "../domain/stage-winner";
import { memoryTournamentWriter } from "./ports.test-utils";
import { settleStageWinner } from "./stage-winner";

const outcome = (overrides: Partial<StageOutcome>) =>
  ({
    firstPlaceIds: ["alpha"],
    matches: [],
    source: "manual",
    winnerId: null,
    ...overrides,
  }) satisfies StageOutcome;

describe(settleStageWinner, () => {
  it("stores the derived winner of a manual stage", async () => {
    const tournaments = memoryTournamentWriter();
    tournaments.outcomesByTournament.set("cup", outcome({}));

    await settleStageWinner(tournaments, "cup");

    expect(tournaments.winners).toStrictEqual([{ participantId: "alpha", tournamentId: "cup" }]);
  });

  it("clears a winner the stage no longer supports", async () => {
    const tournaments = memoryTournamentWriter();
    tournaments.outcomesByTournament.set("cup", outcome({ firstPlaceIds: [], winnerId: "alpha" }));

    await settleStageWinner(tournaments, "cup");

    expect(tournaments.winners).toStrictEqual([{ participantId: null, tournamentId: "cup" }]);
  });

  it("leaves an unchanged winner and PandaScore stages alone", async () => {
    const tournaments = memoryTournamentWriter();
    tournaments.outcomesByTournament.set("cup", outcome({ winnerId: "alpha" }));
    tournaments.outcomesByTournament.set(
      "synced",
      outcome({ firstPlaceIds: ["beta"], source: "pandascore", winnerId: "alpha" }),
    );

    await settleStageWinner(tournaments, "cup");
    await settleStageWinner(tournaments, "synced");
    await settleStageWinner(tournaments, "missing");

    expect(tournaments.winners).toStrictEqual([]);
  });
});
