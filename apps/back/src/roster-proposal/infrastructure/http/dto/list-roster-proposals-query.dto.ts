import { z } from "zod";
import { ROSTER_PROPOSAL_STATUSES } from "../../../domain/roster-proposal";

export const ListRosterProposalsQueryDto = z.strictObject({
  status: z.enum(ROSTER_PROPOSAL_STATUSES).default("pending"),
});
export type ListRosterProposalsQueryDto = z.infer<typeof ListRosterProposalsQueryDto>;
