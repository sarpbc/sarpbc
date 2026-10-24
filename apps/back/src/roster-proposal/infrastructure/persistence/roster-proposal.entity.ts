import { defineEntity, p } from "@mikro-orm/core";
import { User } from "../../../user/infrastructure/persistence/user.entity";
import type {
  RosterChange,
  RosterChangeKind,
  RosterProposalStatus,
} from "../../domain/roster-proposal";

export class RosterProposal {
  id!: string;
  kind!: RosterChangeKind;
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
    kind: p.string().$type<RosterChangeKind>(),
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
