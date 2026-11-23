import type { AppendReplayInput, AttachReplayInput, TournamentStatsGame } from "@sarpbc/types";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { UnprocessableError } from "../../common/domain/errors/unprocessable-error";
import { parseBallchasingRef } from "../domain/ballchasing-ref";
import type { CandidateMatch, GameLocation } from "../domain/replay-matching";
import {
  buildGameRecord,
  buildReplayRecord,
  hasBothTeams,
  platformAccounts,
  requireBallchasing,
  requireTournament,
} from "./game-record";
import type { BallchasingSource, GameStatsStore, StatsCandidates } from "./ports";

const gameNotFound = (number: number) =>
  new NotFoundError({
    code: "match_game_not_found",
    message: `Game ${number} of this match has no stats in this tournament.`,
  });

const sidesOf = (match: CandidateMatch, blueParticipantId: string) => {
  const blue = match.participants.find(({ id }) => id === blueParticipantId);
  const orange = match.participants.find(({ id }) => id !== blueParticipantId);

  if (match.participants.length !== 2 || !blue || !orange) {
    throw new InvalidInputError({
      code: "participant_not_in_match",
      message: "Choose one of the match's two participants as the blue side.",
    });
  }

  return { blue: blue.id, orange: orange.id };
};

const processedStats = async (source: BallchasingSource, replayId: string) => {
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

  return stats;
};

const rostersOf = (match: CandidateMatch) =>
  new Map(match.participants.map(({ id, players }) => [id, players] as const));

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

    const match = await this.match(tournamentId, input.matchId);
    const sides = sidesOf(match, input.blueParticipantId);
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

    await this.refuseAttached(replayId);

    const stored = await this.games.locations(match.storedReplayIds);

    if ([...stored.values()].some((location) => location.number === gameNumber)) {
      throw new ConflictError({
        code: "game_number_taken",
        message: `Game ${gameNumber} of this match already has stats. Remove it first.`,
      });
    }

    const stats = await processedStats(source, replayId);

    const record = buildGameRecord(
      { matchId: match.id, number: gameNumber, sides },
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
      rostersOf(match),
      await this.games.links(platformAccounts(stats)),
    );

    return (await this.games.save(record)) satisfies TournamentStatsGame;
  }

  async appendReplay(tournamentId: string, location: GameLocation, input: AppendReplayInput) {
    const source = requireBallchasing(this.source);
    const replayId = parseBallchasingRef("replay", input.replay);
    await requireTournament(this.candidates, tournamentId);

    const game = await this.games.game(tournamentId, location);

    if (!game) {
      throw gameNotFound(location.number);
    }

    const match = await this.match(tournamentId, location.matchId);
    const sides = sidesOf(match, input.blueParticipantId);
    await this.refuseAttached(replayId);
    const stats = await processedStats(source, replayId);

    const append = buildReplayRecord(
      {
        stats,
        target: {
          ballchasingId: replayId,
          playedAt: stats.playedAt,
          rocketLeagueId: stats.rocketLeagueId,
          sides,
        },
      },
      { blue: game.blueParticipantId, orange: game.orangeParticipantId },
      rostersOf(match),
      await this.games.links(platformAccounts(stats)),
    );

    const appended = await this.games.appendReplay(tournamentId, location, append);

    if (!appended) {
      throw gameNotFound(location.number);
    }

    return appended satisfies TournamentStatsGame;
  }

  async remove(tournamentId: string, matchId: string, number: number) {
    await requireTournament(this.candidates, tournamentId);
    const removed = await this.games.remove(tournamentId, { matchId, number });

    if (!removed) {
      throw gameNotFound(number);
    }

    return removed satisfies TournamentStatsGame;
  }

  async removeReplay(tournamentId: string, location: GameLocation, replay: string) {
    const replayId = parseBallchasingRef("replay", replay);
    await requireTournament(this.candidates, tournamentId);

    const game = await this.games.game(tournamentId, location);

    if (!game) {
      throw gameNotFound(location.number);
    }

    const replayNotFound = new NotFoundError({
      code: "match_game_replay_not_found",
      message: `This replay is not part of game ${location.number} of this match.`,
    });

    if (!game.replays.some(({ ballchasingId }) => ballchasingId === replayId)) {
      throw replayNotFound;
    }

    if (game.replays.length === 1) {
      throw new ConflictError({
        code: "last_game_replay",
        message: "This is the game's only replay. Remove the game instead.",
      });
    }

    const kept = await this.games.removeReplay(tournamentId, location, replayId);

    if (!kept) {
      throw replayNotFound;
    }

    return kept satisfies TournamentStatsGame;
  }

  private async match(tournamentId: string, matchId: string) {
    const candidates = await this.candidates.matches(tournamentId);
    const match = candidates.find((candidate) => candidate.id === matchId);

    if (!match) {
      throw new InvalidInputError({
        code: "match_not_in_tournament",
        message: "Choose a match of this tournament.",
      });
    }

    return match;
  }

  private async refuseAttached(replayId: string) {
    const attached = await this.games.attachment(replayId);

    if (attached) {
      throw new ConflictError({
        code: "replay_already_attached",
        message: `This replay is already attached to game ${attached.number} of ${attached.teams[0]} vs ${attached.teams[1]} in ${attached.tournamentName}. Remove it there first.`,
      });
    }
  }
}
