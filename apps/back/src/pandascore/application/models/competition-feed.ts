import type { UpsertLeagueCommand } from "../commands/upsert-league.command";
import type { UpsertMatchCommand } from "../commands/upsert-match.command";
import type { UpsertPlayerCommand } from "../commands/upsert-player.command";
import type { UpsertTeamCommand } from "../commands/upsert-team.command";
import type { UpsertTournamentCommand } from "../commands/upsert-tournament.command";
export type IncidentKind = "league" | "match" | "player" | "serie" | "team" | "tournament";
export interface ImportedPlayer {
  player: UpsertPlayerCommand;
  currentTeam: UpsertTeamCommand | null;
}
type IncidentChange =
  | { kind: "tournament"; command: UpsertTournamentCommand }
  | { kind: "match"; command: UpsertMatchCommand }
  | { kind: "team"; command: UpsertTeamCommand }
  | { kind: "player"; command: ImportedPlayer }
  | { kind: "league"; command: UpsertLeagueCommand }
  | { kind: "serie" };
export type CompetitionIncident = { id: number; modifiedAt: Date } & (
  | { changeType: "deletion"; kind: IncidentKind }
  | ({ changeType: "creation" | "update" } & IncidentChange)
);
