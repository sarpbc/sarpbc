import type { CurrentRosterSource, CurrentRosterWriter } from "./ports";

export class SyncPandascoreTeamsUseCase {
  constructor(
    private readonly writer: CurrentRosterWriter,
    private readonly source: CurrentRosterSource,
  ) {}
  async seed() {
    if (await this.writer.hasTeams()) {
      return;
    }

    await this.sync();
  }
  async sync() {
    await this.writer.syncCurrentTeams(await this.source.load());
  }
}
