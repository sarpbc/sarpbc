import type { UpsertLeagueCommand } from "../commands/upsert-league.command";
import type { UpsertMatchCommand } from "../commands/upsert-match.command";
import type { UpsertPlayerCommand } from "../commands/upsert-player.command";
import type { UpsertSerieCommand } from "../commands/upsert-serie.command";
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
  | { kind: "serie"; command: UpsertSerieCommand };
/** Why PandaScore removed an entity, parsed from its free-text deletion reason. */
export type ProviderDeletion =
  | { kind: "merged"; intoId: number }
  | { kind: "replaced"; entity: "serie" | "tournament"; byId: number }
  | { kind: "deleted" };
export type CompetitionIncident = { id: number; modifiedAt: Date } & (
  | { changeType: "deletion"; kind: IncidentKind; deletion: ProviderDeletion }
  | ({ changeType: "creation" | "update" } & IncidentChange)
);
