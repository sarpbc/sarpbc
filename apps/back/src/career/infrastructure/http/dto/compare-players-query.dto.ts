import { z } from "zod";

const PlayerSlug = z.string().trim().min(1).max(120);

export const ComparePlayersQueryDto = z.object({ a: PlayerSlug, b: PlayerSlug });

export type ComparePlayersQueryInput = z.infer<typeof ComparePlayersQueryDto>;
