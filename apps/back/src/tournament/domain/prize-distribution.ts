import { MAX_PRIZE_AMOUNT, MAX_PRIZE_ENTRIES, isIso4217Code } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors";

export interface PrizeEntry {
  placement: number;
  amount: number;
  currency: string;
  teamId: string;
  playerIds: string[];
}

export function assertPrizeDistribution(entries: PrizeEntry[]): void {
  if (entries.length > MAX_PRIZE_ENTRIES)
    throw new InvalidInputError(`A prize distribution has at most ${MAX_PRIZE_ENTRIES} entries`);
  const teams = new Set<string>();
  const players = new Set<string>();
  for (const entry of entries) {
    if (!Number.isInteger(entry.placement) || entry.placement < 1)
      throw new InvalidInputError("Placement must be a positive integer");
    if (!Number.isInteger(entry.amount) || entry.amount < 1 || entry.amount > MAX_PRIZE_AMOUNT)
      throw new InvalidInputError(
        `Amount must be a whole number between 1 and ${MAX_PRIZE_AMOUNT}`,
      );
    if (!isIso4217Code(entry.currency))
      throw new InvalidInputError(`"${entry.currency}" is not an ISO 4217 currency code`);
    if (teams.has(entry.teamId))
      throw new InvalidInputError(`Team "${entry.teamId}" appears twice in the distribution`);
    teams.add(entry.teamId);
    for (const playerId of entry.playerIds) {
      if (players.has(playerId))
        throw new InvalidInputError(`Player "${playerId}" appears twice in the distribution`);
      players.add(playerId);
    }
  }
}
