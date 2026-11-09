import type { PlayerAwardType } from "@sarpbc/types";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type {
  AwardContext,
  AwardParticipantRef,
  AwardQueries,
  AwardWriter,
  CompetitionTransaction,
} from "./ports";
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
      await this.requireEligible(awards, tournamentId, { participantId }, playerId);
      return awards.create({ tournamentId, participantId, playerId, awardType });
    });
  }
  async requireProposable(
    tournamentId: string,
    teamId: string,
    playerId: string,
    awardType: PlayerAwardType,
  ): Promise<void> {
    await this.transaction.run(({ awards }) =>
      this.requireProposableIn(awards, tournamentId, teamId, playerId, awardType),
    );
  }
  async createForTeam(
    tournamentId: string,
    teamId: string,
    playerId: string,
    awardType: PlayerAwardType,
  ) {
    return this.transaction.run(async ({ awards }) => {
      const participantId = await this.requireProposableIn(
        awards,
        tournamentId,
        teamId,
        playerId,
        awardType,
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
  private async requireProposableIn(
    awards: AwardWriter,
    tournamentId: string,
    teamId: string,
    playerId: string,
    awardType: PlayerAwardType,
  ): Promise<string> {
    const { tournament, participant } = await this.requireEligible(
      awards,
      tournamentId,
      { teamId },
      playerId,
    );
    if (tournament.source === "startgg")
      throw new InvalidInputError("Awards of start.gg tournaments cannot be proposed");
    if (await awards.awardTaken(tournamentId, awardType))
      throw new InvalidInputError(
        tournament.name +
          " already has a " +
          awardType.replaceAll("_", " ") +
          " award. A tournament has one award of each type.",
      );
    return participant.id;
  }
  private async requireEligible(
    awards: AwardWriter,
    tournamentId: string,
    participantRef: AwardParticipantRef,
    playerId: string,
  ): Promise<{
    tournament: NonNullable<AwardContext["tournament"]>;
    participant: NonNullable<AwardContext["participant"]>;
  }> {
    const { tournament, participant, player } = await awards.context(
      tournamentId,
      participantRef,
      playerId,
    );
    if (!tournament) throw new NotFoundError('Tournament with id "' + tournamentId + '" not found');
    if (!participant)
      throw new NotFoundError(
        "Tournament participant " +
          ("participantId" in participantRef
            ? 'with id "' + participantRef.participantId + '"'
            : 'for team "' + participantRef.teamId + '"') +
          " was not found for this tournament",
      );
    if (!player) throw new NotFoundError('Player with id "' + playerId + '" not found');
    if (!participant.playerIds.includes(playerId))
      throw new InvalidInputError(
        player.name +
          " is not on the roster for " +
          participant.team.name +
          ". Add the player to this team in the tournament roster first.",
      );
    return { tournament, participant };
  }
}
