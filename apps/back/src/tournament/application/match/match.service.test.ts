import { beforeEach, describe, expect, it } from "vitest";
import { Match } from "../../domain/match";
import type { TournamentSummary } from "../../domain/match";
import { TournamentParticipant } from "../../domain/tournament-participant";
import { matchDecided } from "../../domain/match-decided";
import { CompetitionAfterCommit } from "../after-commit";
import { MatchService } from "./match.service";
import {
  memoryMatchWriter,
  memoryTournamentWriter,
  recordingCache,
  recordingDiagnostics,
  recordingEvents,
  transactionOver,
} from "../ports.test-utils";
import { matchQueries } from "../../../../test/competition-doubles";

describe("MatchService decided events", () => {
  const participants = ["a", "b"].map((id) => Object.assign(new TournamentParticipant(), { id }));
  let matches = memoryMatchWriter();
  let tournaments = memoryTournamentWriter();
  let events = recordingEvents();
  let diagnostics = recordingDiagnostics();
  let cache = recordingCache();
  let service: MatchService;

  const cup: TournamentSummary = {
    beginAt: null,
    event: { id: "event", name: "Event", slug: "event" },
    eventStreams: [],
    id: "cup",
    league: null,
    name: "Cup",
    pandascoreId: null,
    pickemsEnabled: false,
    slug: "cup",
    source: "manual",
    streams: [],
  };

  const storedMatch = (fields: Partial<Match> = {}) =>
    Object.assign(new Match(), {
      id: "match",
      participants,
      tournament: { id: "cup" },
      ...fields,
    });

  const seed = (match: Match) => matches.matches.set(match.id, match);

  beforeEach(() => {
    matches = memoryMatchWriter();
    tournaments = memoryTournamentWriter();
    events = recordingEvents();
    diagnostics = recordingDiagnostics();
    cache = recordingCache();
    matches.summaries.set(cup.id, cup);
    matches.participantsByTournament.set(cup.id, participants);
    seed(storedMatch());
    service = new MatchService(
      matchQueries({
        detail: async () => matches.savedMatches.at(-1) ?? matches.matches.get("match") ?? null,
      }),
      transactionOver({ matches, tournaments }),
      new CompetitionAfterCommit(cache, events, diagnostics),
    );
  });

  it("publishes MatchDecided once a winner is set", async () => {
    await service.setMatchWinner("match", "a");

    expect(events.published).toStrictEqual([matchDecided("match")]);
  });

  it("crowns the stage winner in the same write as the final", async () => {
    tournaments.outcomesByTournament.set(cup.id, {
      firstPlaceIds: [],
      matches: [{ id: "match", previousMatchIds: ["semi"], winnerId: "a" }],
      source: "manual",
      winnerId: null,
    });

    await service.setMatchWinner("match", "a");

    expect(tournaments.winners).toStrictEqual([{ participantId: "a", tournamentId: cup.id }]);
  });

  it("stays silent for an undecided match", async () => {
    await service.createMatch("cup", { name: "Final", participantIds: ["a", "b"] });

    expect(events.published).toStrictEqual([]);
  });

  it("does not re-score a decided match when only its VODs change", async () => {
    seed(storedMatch({ status: "finished", winner: participants[0] }));

    await service.setVods("match", [{ game: 1, language: "en", url: "https://youtu.be/a" }]);
    await service.setGameVods("match", 2, []);

    expect(events.published).toStrictEqual([]);
  });

  it("refreshes the cached tournament without re-scoring when only the source changes", async () => {
    seed(storedMatch({ status: "finished", winner: participants[0] }));

    await service.setSource("match", "https://www.rocketleague.com/en/news/rlcs-official-rules");

    expect(cache.invalidated).toContain("cup");
    expect(events.published).toStrictEqual([]);
  });

  it("returns the match when publication fails", async () => {
    const failure = new Error("listener");
    events.failWith(failure);

    await expect(service.setMatchWinner("match", "a")).resolves.toMatchObject({ id: "match" });
    expect(diagnostics.errors).toContainEqual({
      cause: failure,
      message: "MatchDecided publication failed",
    });
  });
});
