import type { UpsertPlayerCommand } from "../../pandascore/application/commands/upsert-player.command";
import type { UpsertTeamCommand } from "../../pandascore/application/commands/upsert-team.command";
export interface CurrentRoster {
  player: UpsertPlayerCommand;
  team: UpsertTeamCommand | null;
}
export interface CurrentRosterSource {
  load(): Promise<CurrentRoster[]>;
}
export interface CurrentRosterWriter {
  hasTeams(): Promise<boolean>;
  syncCurrentTeams(roster: CurrentRoster[]): Promise<void>;
}
export class SyncPandascoreTeamsUseCase {
  constructor(
    private readonly writer: CurrentRosterWriter,
    private readonly source: CurrentRosterSource,
  ) {}
  async execute(cancelIfExistingTeam: boolean): Promise<void> {
    if (cancelIfExistingTeam && (await this.writer.hasTeams())) return;
    const roster = await this.source.load();
    await this.writer.syncCurrentTeams(roster);
  }
}
