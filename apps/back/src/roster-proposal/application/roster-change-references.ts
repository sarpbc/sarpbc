import type { RosterChange } from "@sarpbc/types";

type Kind = RosterChange["kind"];

type ChangeMap = { [K in Kind]: Extract<RosterChange, { kind: K }> };

type ReferenceTable = { [K in Kind]: (change: ChangeMap[K]) => string[] };

const none = () => [];

const playerReferences: ReferenceTable = {
  add_player_to_team: (change) => [change.playerId],
  add_team_alias: none,
  award_player: (change) => [change.playerId],
  award_season_player: (change) => [change.playerId],
  create_contract: (change) => [change.playerId],
  create_player: none,
  create_team: none,
  delete_match: none,
  delete_team: none,
  merge_players: (change) => [change.keptId, change.duplicateId],
  merge_teams: none,
  remove_player_from_team: (change) => [change.playerId],
  set_circuit_stage_scale: none,
  set_event_streams: none,
  set_event_viewership: none,
  set_match_lineups: (change) => change.lineups.flatMap(({ playerIds }) => playerIds),
  set_match_streams: none,
  set_match_viewership: none,
  set_tournament_prizes: (change) => change.prizes.flatMap(({ playerIds }) => playerIds),
  set_tournament_streams: none,
  update_contract: (change) => [change.playerId],
  update_player: (change) => [change.playerId],
  update_team: none,
  update_team_alias: none,
  update_tournament_prize: (change) => change.patch.playerIds ?? [],
  upload_team_logo: none,
};

const teamReferences: ReferenceTable = {
  add_player_to_team: (change) => [change.teamId],
  add_team_alias: (change) => [change.teamId],
  award_player: (change) => [change.teamId],
  award_season_player: none,
  create_contract: (change) => [change.teamId],
  create_player: none,
  create_team: none,
  delete_match: none,
  delete_team: (change) =>
    change.mergeIntoTeamId !== undefined && change.mergeIntoTeamId !== ""
      ? [change.teamId, change.mergeIntoTeamId]
      : [change.teamId],
  merge_players: none,
  merge_teams: (change) => [change.keptId, change.duplicateId],
  remove_player_from_team: (change) => [change.teamId],
  set_circuit_stage_scale: (change) => [
    ...new Set([
      ...(change.regionTeamIds ?? []),
      ...(change.finishes ?? []).map(({ teamId }) => teamId),
    ]),
  ],
  set_event_streams: none,
  set_event_viewership: none,
  set_match_lineups: none,
  set_match_streams: none,
  set_match_viewership: none,
  set_tournament_prizes: (change) => change.prizes.map(({ teamId }) => teamId),
  set_tournament_streams: none,
  update_contract: (change) =>
    change.teamId !== undefined && change.teamId !== "" ? [change.teamId] : [],
  update_player: none,
  update_team: (change) => [change.teamId],
  update_team_alias: (change) => [change.teamId],
  update_tournament_prize: (change) => [change.teamId],
  upload_team_logo: (change) => [change.teamId],
};

const referencesOf = <K extends Kind>(table: ReferenceTable, kind: K, change: ChangeMap[K]) =>
  table[kind](change);

export const referencedPlayerIds = (change: RosterChange) =>
  referencesOf(playerReferences, change.kind, change);

export const referencedTeamIds = (change: RosterChange) =>
  referencesOf(teamReferences, change.kind, change);
