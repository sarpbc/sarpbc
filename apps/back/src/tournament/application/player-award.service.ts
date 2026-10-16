import type { PlayerAwardType } from "@sarpbc/types";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { AwardQueries, CompetitionTransaction } from "./ports";
export class PlayerAwardService {
  constructor(
    private readonly reads: AwardQueries,
    private readonly transaction: CompetitionTransaction,
  ) {}
  async findByPlayerId(id: string) {
    const awards = await this.reads.byPlayer(id);
    if (!awards) throw new NotFoundError('Player with id "' + id + '" not found');
    return awards;
  }
  async findByTournamentId(id: string) {
    const awards = await this.reads.byTournament(id);
    if (!awards) throw new NotFoundError('Tournament with id "' + id + '" not found');
    return awards;
  }
  async create(
    tournamentId: string,
    participantId: string,
    playerId: string,
    awardType: PlayerAwardType,
  ) {
    return this.transaction.run(async ({ awards }) => {
      const context = await awards.context(tournamentId, participantId, playerId);
      if (!context.tournament)
        throw new NotFoundError('Tournament with id "' + tournamentId + '" not found');
      if (!context.participant)
        throw new NotFoundError(
          'Tournament participant with id "' +
            participantId +
            '" was not found for this tournament',
        );
      if (!context.player) throw new NotFoundError('Player with id "' + playerId + '" not found');
      if (!context.participant.playerIds.includes(playerId))
        throw new InvalidInputError(
          context.player.name +
            " is not on the roster for " +
            context.participant.team.name +
            ". Add the player to this team in the tournament roster first.",
        );
      return awards.create({ tournamentId, participantId, playerId, awardType });
    });
  }
  async delete(tournamentId: string, awardId: string) {
    await this.transaction.run(async ({ awards }) => {
      if (!(await awards.remove(tournamentId, awardId)))
        throw new NotFoundError(
          'Award with id "' + awardId + '" was not found for tournament "' + tournamentId + '"',
        );
    });
  }
}
