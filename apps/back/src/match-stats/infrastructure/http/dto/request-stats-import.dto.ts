import { z } from "zod";

export const RequestStatsImportDto = z.strictObject({
  group: z.string().trim().min(1).max(300),
});

export type RequestStatsImportDto = z.infer<typeof RequestStatsImportDto>;
