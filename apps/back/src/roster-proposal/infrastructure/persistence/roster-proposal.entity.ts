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
    change: p.json().$type<RosterChange>(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    entityId: p.uuid().nullable(),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    proposedBy: p.manyToOne(User),
    reviewedAt: p.datetime().type("timestamptz").nullable(),
    reviewedBy: p.manyToOne(User).nullable(),
    sourceUrl: p.text(),
    status: p.string().$type<RosterProposalStatus>().default("pending"),
  },
});
