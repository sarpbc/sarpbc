import { defineEntity, p } from "@mikro-orm/core";
import { User } from "../../../user/infrastructure/user-persistence";
import type { RosterChange, RosterProposalStatus } from "@sarpbc/types";

export class RosterProposal {
  id!: string;
  change!: RosterChange;
  sourceUrl!: string;
  status: RosterProposalStatus = "pending";
  proposedBy!: User;
  reviewedBy: User | null = null;
  reviewedAt: Date | null = null;
  entityId: string | null = null;
  createdAt = new Date();
}

export const RosterProposalSchema = defineEntity({
  class: RosterProposal,
  indexes: [{ properties: ["status", "createdAt"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    change: p.json().$type<RosterChange>(),
    sourceUrl: p.text(),
    status: p.string().$type<RosterProposalStatus>().default("pending"),
    proposedBy: p.manyToOne(User),
    reviewedBy: p.manyToOne(User).nullable(),
    reviewedAt: p.datetime().type("timestamptz").nullable(),
    entityId: p.uuid().nullable(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});
