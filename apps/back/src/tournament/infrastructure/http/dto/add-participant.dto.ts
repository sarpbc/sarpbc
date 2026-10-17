import { z } from "zod";
export const AddParticipantPlayerDto = z.strictObject({
  playerId: z.string(),
  playerName: z.string(),
  playerSlug: z.string().optional(),
  imageUrl: z.string().optional(),
  nationality: z.string().optional(),
});
export type AddParticipantPlayerDto = z.infer<typeof AddParticipantPlayerDto>;
export const AddParticipantDto = z.strictObject({
  teamId: z.string(),
  teamName: z.string(),
  teamSlug: z.string().optional(),
  imageUrl: z.string().optional(),
  location: z.string().optional(),
  players: z.array(AddParticipantPlayerDto).length(3),
});
export type AddParticipantDto = z.infer<typeof AddParticipantDto>;
