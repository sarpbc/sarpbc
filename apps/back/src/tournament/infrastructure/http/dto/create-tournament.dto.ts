import { z } from "zod";
import { TOURNAMENT_FORMATS } from "@sarpbc/types";
import { DATA_SOURCE_URL_MAX_LENGTH } from "@sarpbc/utils";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";

const tournamentWriteFields = {
  eventId: z.uuidv4({ message: "Choose a valid event." }).optional(),
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
          .pipe(z.url({ protocol: /^(?:https?|ftp)$/ })),
        z.literal(""),
      ]),
    )
    .nullish(),
  format: z.enum(TOURNAMENT_FORMATS).optional(),
  teamIds: z
    .array(z.uuidv4())
    .refine((ids) => new Set(ids).size === ids.length, "Each team can only be added once.")
    .optional(),
  playerParticipants: z
    .array(z.array(z.uuidv4()).min(1).max(2))
    .refine(
      (groups) => new Set(groups.flat()).size === groups.flat().length,
      "Each player can only be in one participant.",
    )
    .optional(),
  hasBracket: z.boolean().optional(),
};

const tournamentName = z.string().trim().min(1, "Enter a tournament name.").max(255);

export const createTournamentFields = {
  ...tournamentWriteFields,
  name: tournamentName,
  source: z.enum(["manual", "startgg"]).optional(),
};

export const CreateTournamentDto = z.strictObject(createTournamentFields);

export type CreateTournamentInput = z.infer<typeof CreateTournamentDto>;

const participantRoster = z.strictObject({
  teamId: z.uuidv4(),
  playerIds: z
    .array(z.uuidv4())
    .refine((ids) => new Set(ids).size === ids.length, "Each player can only be listed once."),
  sourceUrl: z.string().max(DATA_SOURCE_URL_MAX_LENGTH).nullable().optional(),
});

export const updateTournamentFields = {
  ...tournamentWriteFields,
  name: tournamentName.optional(),
  rosters: z
    .array(participantRoster)
    .refine(
      (rosters) => new Set(rosters.map((roster) => roster.teamId)).size === rosters.length,
      "Each team can only have one roster.",
    )
    .optional(),
};

export const UpdateTournamentDto = z.strictObject(updateTournamentFields);

export type UpdateTournamentInput = z.infer<typeof UpdateTournamentDto>;
