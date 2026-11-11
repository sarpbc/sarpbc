import type { CircuitScaleTier } from "./circuit";
import type { ContractRole } from "./contract";
import type { MatchLineupInput } from "./lineup";
import type { PlayerAwardType } from "./player-award";
import type { PlayerStatus } from "./player";
import type { PrizeEntry } from "./prize";
import type { StreamInput } from "./stream";
import type { TeamLogoVariant } from "./team";
import type { Viewership } from "./viewership";

export type RosterChange =
  | {
      kind: "add_player_to_team";
      playerId: string;
      teamId: string;
      effectiveDate: string;
      contractRole?: ContractRole;
    }
  | {
      kind: "remove_player_from_team";
      playerId: string;
      teamId: string;
      effectiveDate: string;
      status: Extract<PlayerStatus, "free_agent" | "retired">;
    }
  | {
      kind: "create_player";
      name: string;
      nationality?: string;
      status: PlayerStatus;
    }
  | {
      kind: "update_player";
      playerId: string;
      name?: string;
      nationality?: string;
      status?: PlayerStatus;
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
      variant: TeamLogoVariant;
      imageUrl: string;
      logoKey: string;
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
    }
  | { kind: "set_tournament_prizes"; tournamentId: string; prizes: PrizeEntry[] }
  | {
      kind: "award_player";
      tournamentId: string;
      teamId: string;
      playerId: string;
      awardType: PlayerAwardType;
    }
  | { kind: "set_event_streams"; eventId: string; streams: StreamInput[] }
  | { kind: "set_tournament_streams"; tournamentId: string; streams: StreamInput[] }
  | { kind: "set_match_streams"; matchId: string; streams: StreamInput[] }
  | { kind: "set_match_lineups"; matchId: string; lineups: MatchLineupInput[] }
  | { kind: "set_event_viewership"; eventId: string; viewership: Viewership }
  | { kind: "set_match_viewership"; matchId: string; viewership: Viewership }
  | {
      kind: "set_circuit_stage_scale";
      circuitId: string;
      tournamentId: string;
      scale: CircuitScaleTier[];
    }
  | { kind: "delete_match"; matchId: string; reason: string }
  | { kind: "delete_team"; teamId: string; reason: string; mergeIntoTeamId?: string };

export const ROSTER_PROPOSAL_STATUSES = ["pending", "applied", "rejected"] as const;

export type RosterProposalStatus = (typeof ROSTER_PROPOSAL_STATUSES)[number];

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
