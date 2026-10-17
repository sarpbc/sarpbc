import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidInputError } from "../../../common/domain/errors";
import { Team } from "../../../player/domain/roster";
import { Match, Tournament, TournamentParticipant } from "../../domain/competition";
import type { MatchWriter } from "../ports";
import { setWinnerInTransaction, upsertMatchInTransaction } from "./write-match";

describe("Match writes", () => {
  const tournament = Object.assign(new Tournament(), { id: "cup" });
  const participants = ["a", "b"].map((id) =>
    Object.assign(new TournamentParticipant(), {
      id,
      tournamentId: tournament.id,
      team: Object.assign(new Team(), { id: `team-${id}` }),
    }),
  );
  const writer = {
    load: vi.fn(),
    byPandascoreId: vi.fn(),
    save: vi.fn(),
    tournament: vi.fn(),
    participants: vi.fn(),
  } satisfies MatchWriter;

  beforeEach(() => {
    vi.resetAllMocks();
    writer.tournament.mockResolvedValue(tournament);
    writer.participants.mockResolvedValue(participants);
    writer.byPandascoreId.mockResolvedValue(null);
  });

  it("derives a finished match winner from scores", async () => {
    const match = await upsertMatchInTransaction(writer, tournament.id, {
      name: "Final",
      participantIds: ["a", "b"],
      status: "finished",
      results: [
        { participantId: "a", score: 4 },
        { participantId: "b", score: 2 },
      ],
    });
    expect(match.winner?.id).toBe("a");
    expect(match.results.map((result) => result.score)).toEqual([4, 2]);
    expect(writer.save).toHaveBeenCalledWith(match);
  });

  it("rejects participants belonging to another tournament", async () => {
    await expect(
      upsertMatchInTransaction(writer, tournament.id, {
        name: "Final",
        participantIds: ["a", "outsider"],
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("preserves an edited slug and omitted streams when refreshing a match", async () => {
    const match = Object.assign(new Match(), {
      id: "match",
      tournament,
      slug: "local-final",
      officialStreams: [{ language: "en", url: "https://twitch.tv/rocketleague", main: true }],
    });
    writer.byPandascoreId.mockResolvedValue(match);
    const updated = await upsertMatchInTransaction(writer, tournament.id, {
      name: "Final",
      pandascoreId: 123,
      slug: "provider-final",
      participantIds: ["a", "b"],
    });
    expect(updated.slug).toBe("local-final");
    expect(updated.officialStreams).toEqual([
      { language: "en", url: "https://twitch.tv/rocketleague", main: true },
    ]);
  });

  it("rejects a manually selected winner outside the match", async () => {
    writer.load.mockResolvedValue(Object.assign(new Match(), { participants }));
    await expect(setWinnerInTransaction(writer, "match", "outsider")).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("finishes a match when a participant is selected as winner", async () => {
    writer.load.mockResolvedValue(Object.assign(new Match(), { participants }));
    const match = await setWinnerInTransaction(writer, "match", "b");
    expect(match).toMatchObject({ status: "finished", winner: { id: "b" } });
    expect(writer.save).toHaveBeenCalledWith(match);
  });
});
