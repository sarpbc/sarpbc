import type { RosterChange, StaffPermission, User } from "@sarpbc/types";

export const ROSTER_PROPOSAL_PERMISSIONS = [
  "players.manage",
  "teams.manage",
  "tournaments.manage",
] as const satisfies readonly StaffPermission[];

export function isStaffUser(user: User | null | undefined): boolean {
  return (user?.permissions?.length ?? 0) > 0;
}

export function hasPermission(user: User | null | undefined, permission: StaffPermission): boolean {
  return user?.permissions?.includes(permission) === true;
}

export function canModerateComments(user: User | null | undefined): boolean {
  return hasPermission(user, "forum.moderate");
}

export function requiredPermission(change: RosterChange): StaffPermission {
  switch (change.kind) {
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
    case "upload_team_logo":
    case "merge_teams":
    case "delete_team":
      return "teams.manage";
    case "set_tournament_prizes":
    case "award_player":
    case "set_event_streams":
    case "set_tournament_streams":
    case "set_match_streams":
    case "delete_match":
      return "tournaments.manage";
    default: {
      const exhaustive: never = change;
      return exhaustive;
    }
  }
}
