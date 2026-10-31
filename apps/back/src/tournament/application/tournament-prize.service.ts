import type { ProfileEarnings, TournamentPrizes } from "@sarpbc/types";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { assertPrizeDistribution, type PrizeEntry } from "../domain/prize-distribution";
import { summarizeEarnings } from "./earnings";
import type { EarningsScope, PrizeParticipant, PrizeQueries, PrizeTransaction } from "./ports";

function assertParticipants(entries: PrizeEntry[], participants: PrizeParticipant[]): void {
  const rosters = new Map(participants.map(({ teamId, playerIds }) => [teamId, playerIds]));
  for (const { teamId, playerIds } of entries) {
    const roster = rosters.get(teamId);
    if (!roster)
      throw new InvalidInputError(
        `Team "${teamId}" is not a participant of this tournament. Add it as a participant first.`,
      );
    const outsiders = playerIds.filter((playerId) => !roster.includes(playerId));
    if (outsiders.length > 0)
      throw new InvalidInputError(
        `Players ${outsiders.join(", ")} are not on the tournament roster of team "${teamId}".`,
      );
  }
}

export class TournamentPrizeService {
  constructor(
    private readonly reads: PrizeQueries,
    private readonly transaction: PrizeTransaction,
  ) {}

  async findByTournamentId(id: string): Promise<TournamentPrizes> {
    const prizes = await this.reads.byTournament(id);
    if (!prizes) throw new NotFoundError(`Tournament with id "${id}" not found`);
    return prizes;
  }

  async requireProposableTournament(id: string): Promise<void> {
    const source = await this.reads.tournamentSource(id);
    if (!source) throw new NotFoundError(`Tournament with id "${id}" not found`);
    if (source === "startgg")
      throw new InvalidInputError("Prize distributions of start.gg tournaments cannot be proposed");
  }

  async teamEarnings(teamId: string, scope: EarningsScope): Promise<ProfileEarnings> {
    return summarizeEarnings(await this.reads.byTeam(teamId, scope));
  }

  async playerEarnings(playerId: string, scope: EarningsScope): Promise<ProfileEarnings> {
    return summarizeEarnings(await this.reads.byPlayer(playerId, scope));
  }

  async setDistribution(tournamentId: string, entries: PrizeEntry[]): Promise<TournamentPrizes> {
    assertPrizeDistribution(entries);
    await this.transaction.run(async ({ prizes }) => {
      if (!(await prizes.tournamentExists(tournamentId)))
        throw new NotFoundError(`Tournament with id "${tournamentId}" not found`);
      assertParticipants(entries, await prizes.participants(tournamentId));
      await prizes.replace(tournamentId, entries);
    });
    return this.findByTournamentId(tournamentId);
  }
}
