import type { CurrentRosterSource, CurrentRosterWriter } from "./ports";
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
