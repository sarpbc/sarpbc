import { z } from "zod";

export const requestStatsImportFields = {
  group: z.string().trim().min(1).max(300),
};

export const RequestStatsImportDto = z.strictObject(requestStatsImportFields);

export type RequestStatsImportDto = z.infer<typeof RequestStatsImportDto>;
