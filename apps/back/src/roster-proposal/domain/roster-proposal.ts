import type { RosterChange, RosterProposalStatus } from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors";

export class RosterProposal {
  id = "";
  change!: RosterChange;
  sourceUrl = "";
  status: RosterProposalStatus = "pending";
  proposedById = "";
  reviewedById: string | null = null;
  reviewedAt: Date | null = null;
  entityId: string | null = null;
  createdAt = new Date();

  approve(reviewerId: string, at: Date): void {
    this.review(reviewerId, at);
    this.status = "applied";
  }

  reject(reviewerId: string, at: Date): void {
    this.review(reviewerId, at);
    this.status = "rejected";
  }

  private review(reviewerId: string, at: Date): void {
    if (this.status !== "pending") {
      throw new InvalidInputError(`This proposal was already ${this.status}`);
    }
    this.reviewedById = reviewerId;
    this.reviewedAt = at;
  }
}
