import type { AttachReplayInput, TournamentStatsGame } from "@sarpbc/types";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { UnprocessableError } from "../../common/domain/errors/unprocessable-error";
import { parseBallchasingRef } from "../domain/ballchasing-ref";
import {
  buildGameRecord,
  hasBothTeams,
  platformAccounts,
  requireBallchasing,
  requireTournament,
} from "./game-record";
import type { BallchasingSource, GameStatsStore, StatsCandidates } from "./ports";

/** Staff overrides: they skip the series, team and date rules of the import, not its integrity checks. */
export class ManualGameService {
  constructor(
    private readonly source: BallchasingSource | null,
    private readonly candidates: StatsCandidates,
    private readonly games: GameStatsStore,
  ) {}

  async list(tournamentId: string) {
    await requireTournament(this.candidates, tournamentId);

    return (await this.games.inTournament(tournamentId)) satisfies TournamentStatsGame[];
  }

  async attach(tournamentId: string, input: AttachReplayInput) {
    const source = requireBallchasing(this.source);
    const replayId = parseBallchasingRef("replay", input.replay);
    await requireTournament(this.candidates, tournamentId);

    const candidates = await this.candidates.matches(tournamentId);
    const match = candidates.find((candidate) => candidate.id === input.matchId);

    if (!match) {
      throw new InvalidInputError({
        code: "match_not_in_tournament",
        message: "Choose a match of this tournament.",
      });
    }

    const blue = match.participants.find(({ id }) => id === input.blueParticipantId);
    const orange = match.participants.find(({ id }) => id !== input.blueParticipantId);

    if (match.participants.length !== 2 || !blue || !orange) {
      throw new InvalidInputError({
        code: "participant_not_in_match",
        message: "Choose one of the match's two participants as the blue side.",
      });
    }

    const { gameNumber } = input;

    if (
      !Number.isInteger(gameNumber) ||
      gameNumber < 1 ||
      (match.numberOfGames !== null && gameNumber > match.numberOfGames)
    ) {
      throw new InvalidInputError({
        code: "game_number_out_of_range",
        message:
          match.numberOfGames === null
            ? "The game number starts at 1."
            : `Choose a game number from 1 to ${match.numberOfGames}.`,
      });
    }

    const attached = await this.games.attachment(replayId);

    if (attached) {
      throw new ConflictError({
        code: "replay_already_attached",
        message: `This replay is already attached to game ${attached.number} of ${attached.teams[0]} vs ${attached.teams[1]} in ${attached.tournamentName}. Remove it there first.`,
      });
    }

    const stored = await this.games.locations(match.storedReplayIds);

    if ([...stored.values()].some((location) => location.number === gameNumber)) {
      throw new ConflictError({
        code: "game_number_taken",
        message: `Game ${gameNumber} of this match already has stats. Remove it first.`,
      });
    }

    const stats = await source.replayStats(replayId);

    if (!stats) {
      throw new UnprocessableError({
        code: "replay_not_ready",
        message: "Ballchasing has not finished processing this replay. Try again in a few minutes.",
      });
    }

    if (!hasBothTeams(stats)) {
      throw new UnprocessableError({
        code: "player_mismatch",
        message: "This replay has no players on one side.",
      });
    }

    const sides = { blue: blue.id, orange: orange.id };
    const rosters = new Map(match.participants.map(({ id, players }) => [id, players] as const));

    const record = buildGameRecord(
      { matchId: match.id, number: gameNumber },
      [
        {
          stats,
          target: {
            ballchasingId: replayId,
            playedAt: stats.playedAt,
            rocketLeagueId: stats.rocketLeagueId,
            sides,
          },
        },
      ],
      rosters,
      await this.games.links(platformAccounts(stats)),
    );

    return (await this.games.save(record)) satisfies TournamentStatsGame;
  }

  async remove(tournamentId: string, matchId: string, number: number) {
    await requireTournament(this.candidates, tournamentId);
    const removed = await this.games.remove(tournamentId, { matchId, number });

    if (!removed) {
      throw new NotFoundError({
        code: "match_game_not_found",
        message: `Game ${number} of this match has no stats in this tournament.`,
      });
    }

    return removed satisfies TournamentStatsGame;
  }
}
