import { InvalidInputError } from "../../common/domain/errors";
import type { PlayerStatus, RosterRole } from "../../player/domain/roster";
import type { StaffPermission } from "../../user/domain/staff-access";

export type RosterChange =
  | { kind: "add_player_to_team"; playerId: string; teamId: string; effectiveDate: string }
  | {
      kind: "remove_player_from_team";
      playerId: string;
      teamId: string;
      effectiveDate: string;
      status: PlayerStatus.FREE_AGENT | PlayerStatus.RETIRED;
    }
  | {
      kind: "create_player";
      name: string;
      nationality?: string;
      status: PlayerStatus;
      role?: RosterRole;
    }
  | {
      kind: "update_player";
      playerId: string;
      name?: string;
      nationality?: string;
      status?: PlayerStatus;
      role?: RosterRole;
    }
  | { kind: "create_team"; name: string; location?: string; imageUrl?: string }
  | {
      kind: "update_team";
      teamId: string;
      name?: string;
      location?: string;
      imageUrl?: string;
      active?: boolean;
    }
  | { kind: "merge_players"; keptId: string; duplicateId: string }
  | { kind: "merge_teams"; keptId: string; duplicateId: string };

export type RosterChangeKind = RosterChange["kind"];

export const ROSTER_PROPOSAL_STATUSES = ["pending", "applied", "rejected"] as const;

export type RosterProposalStatus = (typeof ROSTER_PROPOSAL_STATUSES)[number];

export function requiredPermission(kind: RosterChangeKind): StaffPermission {
  switch (kind) {
    case "add_player_to_team":
    case "remove_player_from_team":
    case "create_player":
    case "update_player":
    case "merge_players":
      return "players.manage";
    case "create_team":
    case "update_team":
    case "merge_teams":
      return "teams.manage";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

/** A sourced roster write held until a staff member approves or rejects it. */
export class RosterProposal {
  id = "";
  change!: RosterChange;
  sourceUrl = "";
  status: RosterProposalStatus = "pending";
  proposedById = "";
  reviewedById: string | null = null;
  reviewedAt: Date | null = null;
  /** Player or team the applied change created or modified. */
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
