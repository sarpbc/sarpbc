import type { CurrentRosterSource, CurrentRosterWriter } from "./ports";

export class SyncPandascoreTeamsUseCase {
  constructor(
    private readonly writer: CurrentRosterWriter,
    private readonly source: CurrentRosterSource,
  ) {}
  async seed(): Promise<void> {
    if (await this.writer.hasTeams()) {
      return;
    }

    await this.sync();
  }
  async sync(): Promise<void> {
    await this.writer.syncCurrentTeams(await this.source.load());
  }
}
