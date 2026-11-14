import type { PrizeEntry, PrizeEntryPatch, ProfileEarnings, TournamentPrizes } from "@sarpbc/types";
import { parseDataSourceUrl } from "../../common/domain/data-source";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { assertPrizeDistribution, patchPrizeEntry } from "../domain/prize-distribution";
import { summarizeEarnings } from "./earnings";
import type { CompetitionAfterCommit } from "./after-commit";
import type {
  EarningsScope,
  PrizeParticipant,
  PrizeQueries,
  PrizeTransaction,
  PrizeWriter,
} from "./ports";

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

  async requireProposablePrize(
    tournamentId: string,
    teamId: string,
    patch: PrizeEntryPatch,
  ): Promise<void> {
    await this.requireProposableTournament(tournamentId);
    await this.transaction.run(async ({ prizes }) => {
      const entries = patchPrizeEntry(await prizes.entries(tournamentId), teamId, patch, null);
      assertPrizeDistribution(entries);
      assertParticipants(entries, await prizes.participants(tournamentId));
    });
  }

  async teamEarnings(teamId: string, scope: EarningsScope): Promise<ProfileEarnings> {
    return summarizeEarnings(await this.reads.byTeam(teamId, scope));
  }

  async playerEarnings(playerId: string, scope: EarningsScope): Promise<ProfileEarnings> {
    return summarizeEarnings(await this.reads.byPlayer(playerId, scope));
  }

  async setDistribution(tournamentId: string, entries: PrizeEntry[]): Promise<TournamentPrizes> {
    const sourced = entries.map((entry) => ({
      ...entry,
      sourceUrl: parseDataSourceUrl(entry.sourceUrl),
    }));

    assertPrizeDistribution(sourced);

    return await this.write(tournamentId, async () => sourced);
  }

  async updateEntry(
    tournamentId: string,
    teamId: string,
    patch: PrizeEntryPatch,
    sourceUrl: string,
  ): Promise<TournamentPrizes> {
    const source = parseDataSourceUrl(sourceUrl);

    return await this.write(tournamentId, async (prizes) =>
      patchPrizeEntry(await prizes.entries(tournamentId), teamId, patch, source),
    );
  }

  private async write(
    tournamentId: string,
    buildEntries: (prizes: PrizeWriter) => Promise<PrizeEntry[]>,
  ): Promise<TournamentPrizes> {
    await this.transaction.run(async ({ prizes }) => {
      if (!(await prizes.tournamentExists(tournamentId)))
        throw new NotFoundError(`Tournament with id "${tournamentId}" not found`);
      const entries = await buildEntries(prizes);
      assertPrizeDistribution(entries);
      assertParticipants(entries, await prizes.participants(tournamentId));
      await prizes.replace(tournamentId, entries);
    });
    await this.afterCommit.settle({ tournamentIds: [tournamentId] });

    return await this.findByTournamentId(tournamentId);
  }
}
