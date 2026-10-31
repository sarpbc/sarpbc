import { z } from "zod";
import { MAX_PRIZE_ENTRIES } from "@sarpbc/utils";

export const TournamentPrizeEntryDto = z.strictObject({
  placement: z.number().int().min(1),
  amount: z.number().int().min(1),
  currency: z.string().length(3),
  teamId: z.uuid(),
  playerIds: z.array(z.uuid()).max(10).default([]),
});

export const SetTournamentPrizesDto = z.strictObject({
  prizes: z.array(TournamentPrizeEntryDto).max(MAX_PRIZE_ENTRIES),
});

export type SetTournamentPrizesDto = z.infer<typeof SetTournamentPrizesDto>;
