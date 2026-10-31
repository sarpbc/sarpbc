import { InvalidInputError } from "../../common/domain/errors";
import type { ContractRole, PlayerStatus, RosterRole } from "../../roster/domain/roster";
import type { StaffPermission } from "../../user/domain/staff-access";
import type { PrizeEntry } from "../../tournament/domain/prize-distribution";

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
  | { kind: "merge_teams"; keptId: string; duplicateId: string }
  | {
      kind: "create_contract";
      playerId: string;
      teamId: string;
      startDate: string;
      endDate?: string;
      contractRole?: ContractRole;
    }
  | {
      kind: "update_contract";
      contractId: string;
      playerId: string;
      teamId?: string;
      startDate?: string;
      endDate?: string | null;
      contractRole?: ContractRole;
    }
  | { kind: "set_tournament_prizes"; tournamentId: string; prizes: PrizeEntry[] };

export type RosterChangeKind = RosterChange["kind"];

export const ROSTER_PROPOSAL_STATUSES = ["pending", "applied", "rejected"] as const;

export type RosterProposalStatus = (typeof ROSTER_PROPOSAL_STATUSES)[number];

export const ROSTER_PROPOSAL_PERMISSIONS = [
  "players.manage",
  "teams.manage",
  "tournaments.manage",
] as const satisfies readonly StaffPermission[];

export function requiredPermission(kind: RosterChangeKind): StaffPermission {
  switch (kind) {
    case "add_player_to_team":
    case "remove_player_from_team":
    case "create_player":
    case "update_player":
    case "merge_players":
    case "create_contract":
    case "update_contract":
      return "players.manage";
    case "create_team":
    case "update_team":
    case "merge_teams":
      return "teams.manage";
    case "set_tournament_prizes":
      return "tournaments.manage";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

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
