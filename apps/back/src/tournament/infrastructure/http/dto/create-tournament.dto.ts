import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
const tournamentWriteSchema = z.strictObject({
  slug: z
    .string()
    .trim()
    .min(1, "Enter a slug, or leave empty to generate one from the name.")
    .max(255)
    .optional(),
  tier: z.string().trim().max(50).nullish(),
  leagueId: z.uuidv4({ message: "Choose a valid league from the list." }).nullish(),
  beginAt: isoDateSchema.nullish(),
  endAt: isoDateSchema.nullish(),
  imageUrl: z
    .string()
    .trim()
    .pipe(
      z.union([
        z
          .string()
          .max(255)
          .pipe(z.url({ protocol: /^(https?|ftp)$/ })),
        z.literal(""),
      ]),
    )
    .nullish(),
  teamIds: z
    .array(z.uuidv4())
    .refine((ids) => new Set(ids).size === ids.length, "Each team can only be added once.")
    .optional(),
});
const tournamentName = z.string().trim().min(1, "Enter a tournament name.").max(255);
export const CreateTournamentDto = tournamentWriteSchema.extend({ name: tournamentName });
export type CreateTournamentDto = z.infer<typeof CreateTournamentDto>;
export const UpdateTournamentDto = tournamentWriteSchema.extend({
  name: tournamentName.optional(),
});
export type UpdateTournamentDto = z.infer<typeof UpdateTournamentDto>;
