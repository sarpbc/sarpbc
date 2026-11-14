import { z } from "zod";
import {
  CIRCUIT_DESCRIPTION_MAX_LENGTH,
  CIRCUIT_NAME_MAX_LENGTH,
  CIRCUIT_REGION_MAX_LENGTH,
  MAX_CIRCUIT_PLACEMENT,
  MAX_CIRCUIT_POINTS,
  MAX_CIRCUIT_QUALIFICATION_SPOTS,
  MAX_CIRCUIT_SCALE_TIERS,
  MAX_CIRCUIT_SEASON,
  MAX_CIRCUIT_STAGE_TEAMS,
  MIN_CIRCUIT_SEASON,
} from "@sarpbc/utils";

const circuitFields = {
  name: z.string().trim().min(1).max(CIRCUIT_NAME_MAX_LENGTH),
  slug: z.string().trim().min(1).max(120).optional(),
  season: z.number().int().min(MIN_CIRCUIT_SEASON).max(MAX_CIRCUIT_SEASON),
  region: z.string().trim().max(CIRCUIT_REGION_MAX_LENGTH).nullish(),
  description: z.string().max(CIRCUIT_DESCRIPTION_MAX_LENGTH).nullish(),
  sourceUrl: z
    .string()
    .trim()
    .max(2048)
    .pipe(z.url().regex(/^https?:\/\//, "Use an http(s) URL")),
  qualificationSpots: z.number().int().min(1).max(MAX_CIRCUIT_QUALIFICATION_SPOTS).nullish(),
};

export const CreateCircuitDto = z.strictObject(circuitFields);

export type CreateCircuitInput = z.infer<typeof CreateCircuitDto>;

export const UpdateCircuitDto = z.strictObject(circuitFields).partial();

export type UpdateCircuitInput = z.infer<typeof UpdateCircuitDto>;

const placement = z.number().int().min(1).max(MAX_CIRCUIT_PLACEMENT);

export const SetCircuitStageDto = z.strictObject({
  scale: z
    .array(
      z.strictObject({
        from: placement,
        to: placement,
        points: z.number().int().min(0).max(MAX_CIRCUIT_POINTS),
      }),
    )
    .max(MAX_CIRCUIT_SCALE_TIERS),
  sourceUrl: z
    .string()
    .trim()
    .pipe(z.url().regex(/^https?:\/\//, "Use an http(s) URL")),
  worldwide: z.boolean().optional(),
  regionTeamIds: z.array(z.uuid()).max(MAX_CIRCUIT_STAGE_TEAMS).optional(),
  finishes: z
    .array(z.strictObject({ teamId: z.uuid(), placement }))
    .max(MAX_CIRCUIT_STAGE_TEAMS)
    .optional(),
});

export type SetCircuitStageInput = z.infer<typeof SetCircuitStageDto>;
