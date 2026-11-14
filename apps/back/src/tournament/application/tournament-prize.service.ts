import type { PrizeEntry, PrizeEntryPatch, ProfileEarnings, TournamentPrizes } from "@sarpbc/types";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { assertPrizeDistribution } from "../domain/prize-distribution";
import { summarizeEarnings } from "./earnings";
import type { CompetitionAfterCommit } from "./after-commit";
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
    private readonly afterCommit: CompetitionAfterCommit,
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

  async requireProposablePrize(tournamentId: string, teamId: string): Promise<void> {
    await this.requireProposableTournament(tournamentId);
    const { prizes } = await this.findByTournamentId(tournamentId);
    if (!prizes.some((prize) => prize.team.id === teamId))
      throw new NotFoundError(`Team "${teamId}" has no prize in tournament "${tournamentId}"`);
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
    await this.afterCommit.settle({ tournamentIds: [tournamentId] });
    return this.findByTournamentId(tournamentId);
  }

  async updateEntry(
    tournamentId: string,
    teamId: string,
    patch: PrizeEntryPatch,
    sourceUrl: string,
  ): Promise<TournamentPrizes> {
    await this.transaction.run(async ({ prizes }) => {
      if (!(await prizes.tournamentExists(tournamentId)))
        throw new NotFoundError(`Tournament with id "${tournamentId}" not found`);
      const current = await prizes.entries(tournamentId);
      if (!current.some((entry) => entry.teamId === teamId))
        throw new NotFoundError(`Team "${teamId}" has no prize in tournament "${tournamentId}"`);
      const entries = current.map((entry) =>
        entry.teamId === teamId
          ? {
              ...entry,
              placement: patch.placement ?? entry.placement,
              amount: patch.amount ?? entry.amount,
              currency: patch.currency ?? entry.currency,
              playerIds: patch.playerIds ?? entry.playerIds,
              sourceUrl,
            }
          : entry,
      );
      assertPrizeDistribution(entries);
      assertParticipants(entries, await prizes.participants(tournamentId));
      await prizes.replace(tournamentId, entries);
    });
    await this.afterCommit.settle({ tournamentIds: [tournamentId] });
    return this.findByTournamentId(tournamentId);
  }
}
