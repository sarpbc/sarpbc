import type { RosterChange } from "@sarpbc/types";

type Kind = RosterChange["kind"];

type ChangeMap = { [K in Kind]: Extract<RosterChange, { kind: K }> };

type ReferenceTable = { [K in Kind]: (change: ChangeMap[K]) => string[] };

const none = (): string[] => [];

const playerReferences: ReferenceTable = {
  add_player_to_team: (change) => [change.playerId],
  remove_player_from_team: (change) => [change.playerId],
  update_player: (change) => [change.playerId],
  create_contract: (change) => [change.playerId],
  update_contract: (change) => [change.playerId],
  award_player: (change) => [change.playerId],
  award_season_player: (change) => [change.playerId],
  merge_players: (change) => [change.keptId, change.duplicateId],
  set_tournament_prizes: (change) => change.prizes.flatMap(({ playerIds }) => playerIds),
  update_tournament_prize: (change) => change.patch.playerIds ?? [],
  set_match_lineups: (change) => change.lineups.flatMap(({ playerIds }) => playerIds),
  create_player: none,
  create_team: none,
  update_team: none,
  upload_team_logo: none,
  add_team_alias: none,
  update_team_alias: none,
  merge_teams: none,
  set_event_streams: none,
  set_tournament_streams: none,
  set_match_streams: none,
  set_event_viewership: none,
  set_match_viewership: none,
  set_circuit_stage_scale: none,
  delete_match: none,
  delete_team: none,
};

const teamReferences: ReferenceTable = {
  add_player_to_team: (change) => [change.teamId],
  remove_player_from_team: (change) => [change.teamId],
  update_team: (change) => [change.teamId],
  upload_team_logo: (change) => [change.teamId],
  add_team_alias: (change) => [change.teamId],
  update_team_alias: (change) => [change.teamId],
  create_contract: (change) => [change.teamId],
  award_player: (change) => [change.teamId],
  update_contract: (change) =>
    change.teamId !== undefined && change.teamId !== "" ? [change.teamId] : [],
  merge_teams: (change) => [change.keptId, change.duplicateId],
  set_tournament_prizes: (change) => change.prizes.map(({ teamId }) => teamId),
  update_tournament_prize: (change) => [change.teamId],
  set_circuit_stage_scale: (change) => [
    ...new Set([
      ...(change.regionTeamIds ?? []),
      ...(change.finishes ?? []).map(({ teamId }) => teamId),
    ]),
  ],
  delete_team: (change) =>
    change.mergeIntoTeamId !== undefined && change.mergeIntoTeamId !== ""
      ? [change.teamId, change.mergeIntoTeamId]
      : [change.teamId],
  create_player: none,
  update_player: none,
  create_team: none,
  merge_players: none,
  award_season_player: none,
  set_event_streams: none,
  set_tournament_streams: none,
  set_match_streams: none,
  set_match_lineups: none,
  set_event_viewership: none,
  set_match_viewership: none,
  delete_match: none,
};

function referencesOf<K extends Kind>(
  table: ReferenceTable,
  kind: K,
  change: ChangeMap[K],
): string[] {
  return table[kind](change);
}

export function referencedPlayerIds(change: RosterChange): string[] {
  return referencesOf(playerReferences, change.kind, change);
}

export function referencedTeamIds(change: RosterChange): string[] {
  return referencesOf(teamReferences, change.kind, change);
}
