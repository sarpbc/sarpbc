import type { ProfileEarnings, TournamentPrizes } from "@sarpbc/types";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { assertPrizeDistribution, type PrizeEntry } from "../domain/prize-distribution";
import { summarizeEarnings } from "./earnings";
import type { CompetitionTransaction, EarningsScope, PrizeQueries } from "./ports";

export class TournamentPrizeService {
  constructor(
    private readonly reads: PrizeQueries,
    private readonly transaction: CompetitionTransaction,
  ) {}

  async findByTournamentId(id: string): Promise<TournamentPrizes> {
    const prizes = await this.reads.byTournament(id);
    if (!prizes) throw new NotFoundError(`Tournament with id "${id}" not found`);
    return prizes;
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
      const missing = await prizes.missingReferences({
        teamIds: entries.map(({ teamId }) => teamId),
        playerIds: entries.flatMap(({ playerIds }) => playerIds),
      });
      if (missing.length > 0)
        throw new InvalidInputError(
          `Unknown or merged teams or players: ${missing.join(", ")}. Use the kept entity ids.`,
        );
      await prizes.replace(tournamentId, entries);
    });
    return this.findByTournamentId(tournamentId);
  }
}
