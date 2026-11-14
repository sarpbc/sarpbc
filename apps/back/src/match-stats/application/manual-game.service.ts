import type { AttachReplayInput, TournamentStatsGame } from "@sarpbc/types";
import {
  ConflictError,
  InvalidInputError,
  NotFoundError,
  UnprocessableError,
} from "../../common/domain/errors";
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

  async list(tournamentId: string): Promise<TournamentStatsGame[]> {
    await requireTournament(this.candidates, tournamentId);

    return this.games.inTournament(tournamentId);
  }

  async attach(tournamentId: string, input: AttachReplayInput): Promise<TournamentStatsGame> {
    const source = requireBallchasing(this.source);
    const replayId = parseBallchasingRef("replay", input.replay);
    await requireTournament(this.candidates, tournamentId);

    const match = (await this.candidates.matches(tournamentId)).find(
      (candidate) => candidate.id === input.matchId,
    );

    if (!match)
      throw new InvalidInputError({
        message: "Choose a match of this tournament.",
        code: "match_not_in_tournament",
      });
    const blue = match.participants.find(({ id }) => id === input.blueParticipantId);
    const orange = match.participants.find(({ id }) => id !== input.blueParticipantId);

    if (match.participants.length !== 2 || !blue || !orange)
      throw new InvalidInputError({
        message: "Choose one of the match's two participants as the blue side.",
        code: "participant_not_in_match",
      });
    const { gameNumber } = input;

    if (
      !Number.isInteger(gameNumber) ||
      gameNumber < 1 ||
      (match.numberOfGames !== null && gameNumber > match.numberOfGames)
    )
      throw new InvalidInputError({
        message:
          match.numberOfGames === null
            ? "The game number starts at 1."
            : `Choose a game number from 1 to ${match.numberOfGames}.`,
        code: "game_number_out_of_range",
      });
    const attached = await this.games.attachment(replayId);

    if (attached)
      throw new ConflictError({
        message: `This replay is already attached to game ${attached.number} of ${attached.teams[0]} vs ${attached.teams[1]} in ${attached.tournamentName}. Remove it there first.`,
        code: "replay_already_attached",
      });
    const stored = await this.games.locations(match.storedReplayIds);

    if ([...stored.values()].some((location) => location.number === gameNumber))
      throw new ConflictError({
        message: `Game ${gameNumber} of this match already has stats. Remove it first.`,
        code: "game_number_taken",
      });

    const stats = await source.replayStats(replayId);

    if (!stats)
      throw new UnprocessableError({
        message: "Ballchasing has not finished processing this replay. Try again in a few minutes.",
        code: "replay_not_ready",
      });

    if (!hasBothTeams(stats))
      throw new UnprocessableError({
        message: "This replay has no players on one side.",
        code: "player_mismatch",
      });

    const sides = { blue: blue.id, orange: orange.id };
    const rosters = new Map(match.participants.map(({ id, players }) => [id, players] as const));

    const record = buildGameRecord(
      {
        matchId: match.id,
        number: gameNumber,
        ballchasingId: replayId,
        rocketLeagueId: stats.rocketLeagueId,
        playedAt: stats.playedAt,
        sides,
      },
      stats,
      rosters,
      await this.games.links(platformAccounts(stats)),
    );

    return this.games.save(record);
  }

  async remove(
    tournamentId: string,
    matchId: string,
    number: number,
  ): Promise<TournamentStatsGame> {
    await requireTournament(this.candidates, tournamentId);
    const removed = await this.games.remove(tournamentId, { matchId, number });

    if (!removed)
      throw new NotFoundError({
        message: `Game ${number} of this match has no stats in this tournament.`,
        code: "match_game_not_found",
      });

    return removed;
  }
}
