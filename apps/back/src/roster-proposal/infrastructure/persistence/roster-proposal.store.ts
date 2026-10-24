import { LockMode } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import { RosterProposal } from "../../domain/roster-proposal";
import type { RosterProposalStore, RosterProposalTransaction } from "../../application/ports";
import { User } from "../../../user/infrastructure/persistence/user.entity";
import * as Row from "./roster-proposal.entity";

function toProposal(row: Row.RosterProposal): RosterProposal {
  return Object.assign(new RosterProposal(), {
    id: row.id,
    change: row.change,
    sourceUrl: row.sourceUrl,
    status: row.status,
    proposedById: row.proposedBy.id,
    reviewedById: row.reviewedBy?.id ?? null,
    reviewedAt: row.reviewedAt,
    entityId: row.entityId,
    createdAt: row.createdAt,
  });
}

export function rosterProposalStore(em: EntityManager, inTransaction = false): RosterProposalStore {
  return {
    findById: async (id) => {
      const row = await em.findOne(
        Row.RosterProposal,
        { id },
        inTransaction ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {},
      );
      return row ? toProposal(row) : null;
    },
    list: async (status, limit) =>
      (await em.find(Row.RosterProposal, { status }, { orderBy: { createdAt: "asc" }, limit })).map(
        toProposal,
      ),
    save: async (model) => {
      const row = model.id
        ? await em.findOneOrFail(Row.RosterProposal, { id: model.id })
        : new Row.RosterProposal();
      if (!model.id) {
        model.id = v4();
        row.id = model.id;
        row.createdAt = model.createdAt;
      }
      Object.assign(row, {
        kind: model.change.kind,
        change: model.change,
        sourceUrl: model.sourceUrl,
        status: model.status,
        proposedBy: em.getReference(User, model.proposedById),
        reviewedBy: model.reviewedById ? em.getReference(User, model.reviewedById) : null,
        reviewedAt: model.reviewedAt,
        entityId: model.entityId,
      });
      em.persist(row);
      if (!inTransaction) await em.flush();
    },
  };
}

export class MikroRosterProposalTransaction implements RosterProposalTransaction {
  constructor(private readonly em: EntityManager) {}
  run<T>(work: (proposals: RosterProposalStore) => Promise<T>): Promise<T> {
    // Roster services called inside the work join this transaction through the ORM context.
    return this.em.transactional(async (tx) => {
      const result = await work(rosterProposalStore(tx, true));
      await tx.flush();
      return result;
    });
  }
}
