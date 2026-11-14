import { z } from "zod";
import {
  CURRENCY_CODE_LENGTH,
  MAX_PRIZE_AMOUNT,
  MAX_PRIZE_ENTRIES,
  MAX_PRIZE_PLAYERS,
  MIN_PRIZE_AMOUNT,
  MIN_PRIZE_PLACEMENT,
  DATA_SOURCE_URL_MAX_LENGTH,
} from "@sarpbc/utils";

export const TournamentPrizeEntryDto = z.strictObject({
  placement: z.number().int().min(MIN_PRIZE_PLACEMENT),
  amount: z.number().int().min(MIN_PRIZE_AMOUNT).max(MAX_PRIZE_AMOUNT),
  currency: z.string().length(CURRENCY_CODE_LENGTH),
  teamId: z.uuid(),
  playerIds: z.array(z.uuid()).max(MAX_PRIZE_PLAYERS).default([]),
  sourceUrl: z.string().max(DATA_SOURCE_URL_MAX_LENGTH).nullable(),
});

export const SetTournamentPrizesDto = z.strictObject({
  prizes: z.array(TournamentPrizeEntryDto).max(MAX_PRIZE_ENTRIES),
});

export type SetTournamentPrizesDto = z.infer<typeof SetTournamentPrizesDto>;
