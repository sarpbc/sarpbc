import type { ContractRole } from "./contract";

export type RosterProposalStatus = "pending" | "applied" | "rejected";

export type RosterChange =
  | { kind: "add_player_to_team"; playerId: string; teamId: string; effectiveDate: string }
  | {
      kind: "remove_player_from_team";
      playerId: string;
      teamId: string;
      effectiveDate: string;
      status: "free_agent" | "retired";
    }
  | {
      kind: "create_player";
      name: string;
      nationality?: string;
      status: "active" | "free_agent" | "retired";
      role?: "player" | "coach" | "substitute";
    }
  | {
      kind: "update_player";
      playerId: string;
      name?: string;
      nationality?: string;
      status?: "active" | "free_agent" | "retired";
      role?: "player" | "coach" | "substitute";
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
  | {
      kind: "upload_team_logo";
      teamId: string;
      variant: "light" | "dark";
      imageUrl: string;
      logoUrl: string;
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
    };

export interface RosterProposal {
  id: string;
  change: RosterChange;
  sourceUrl: string;
  status: RosterProposalStatus;
  proposedById: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  entityId: string | null;
  createdAt: string;
}

export interface RosterProposalList {
  proposals: RosterProposal[];
  names: Record<string, string>;
}
