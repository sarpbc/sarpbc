import type { RosterChange, StaffPermission, User } from "@sarpbc/types";

export const ROSTER_PROPOSAL_PERMISSIONS = [
  "players.manage",
  "teams.manage",
  "tournaments.manage",
] as const satisfies readonly StaffPermission[];

export const isStaffUser = (user: User | null | undefined): boolean =>
  (user?.permissions?.length ?? 0) > 0;

export const hasPermission = (
  user: User | null | undefined,
  permission: StaffPermission,
): boolean => user?.permissions?.includes(permission) === true;

export const canModerateComments = (user: User | null | undefined): boolean =>
  hasPermission(user, "forum.moderate");

const REQUIRED_PERMISSION: Record<RosterChange["kind"], StaffPermission> = {
  add_player_to_team: "players.manage",
  remove_player_from_team: "players.manage",
  create_player: "players.manage",
  update_player: "players.manage",
  merge_players: "players.manage",
  create_contract: "players.manage",
  update_contract: "players.manage",
  create_team: "teams.manage",
  update_team: "teams.manage",
  upload_team_logo: "teams.manage",
  add_team_alias: "teams.manage",
  update_team_alias: "teams.manage",
  merge_teams: "teams.manage",
  delete_team: "teams.manage",
  set_tournament_prizes: "tournaments.manage",
  update_tournament_prize: "tournaments.manage",
  award_player: "tournaments.manage",
  award_season_player: "tournaments.manage",
  set_event_streams: "tournaments.manage",
  set_tournament_streams: "tournaments.manage",
  set_match_streams: "tournaments.manage",
  set_match_lineups: "tournaments.manage",
  set_event_viewership: "tournaments.manage",
  set_match_viewership: "tournaments.manage",
  set_circuit_stage_scale: "tournaments.manage",
  delete_match: "tournaments.manage",
};

export const requiredPermission = (change: RosterChange): StaffPermission =>
  REQUIRED_PERMISSION[change.kind];
