import { z } from "zod";

const name = z.string().trim().min(1, "Enter a name.").max(255);
const slug = z.string().trim().min(1, "Enter a slug, or leave it empty.").max(255);
const leagueId = z.uuidv4({ message: "Choose a valid league from the list." });
const url = z
  .string()
  .trim()
  .max(255)
  .pipe(z.url({ protocol: /^https?$/, message: "Enter a valid http(s) URL." }));
const someField = (fields: Record<string, string | null | undefined>) =>
  Object.values(fields).some((value) => value !== undefined);
const NOTHING_TO_UPDATE = "Change at least one field.";

export const createEventFields = {
  name,
  slug: slug.optional(),
  leagueId: leagueId.optional(),
};
export const CreateEventDto = z.strictObject(createEventFields);
export type CreateEventDto = z.infer<typeof CreateEventDto>;

export const updateEventFields = {
  name: name.optional(),
  slug: slug.optional(),
  leagueId: leagueId.nullable().optional(),
};
export const UpdateEventDto = z
  .strictObject(updateEventFields)
  .refine(someField, NOTHING_TO_UPDATE);
export type UpdateEventDto = z.infer<typeof UpdateEventDto>;

export const createLeagueFields = {
  name,
  slug: slug.optional(),
  url: url.optional(),
  imageUrl: url.optional(),
};
export const CreateLeagueDto = z.strictObject(createLeagueFields);
export type CreateLeagueDto = z.infer<typeof CreateLeagueDto>;

export const updateLeagueFields = {
  name: name.optional(),
  slug: slug.nullable().optional(),
  url: url.nullable().optional(),
  imageUrl: url.nullable().optional(),
};
export const UpdateLeagueDto = z
  .strictObject(updateLeagueFields)
  .refine(someField, NOTHING_TO_UPDATE);
export type UpdateLeagueDto = z.infer<typeof UpdateLeagueDto>;
