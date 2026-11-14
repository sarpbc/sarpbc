import { describe, expect, it, vi } from "vitest";
import type { CurrentRosterSource, CurrentRosterWriter } from "./ports";
import { SyncPandascoreTeamsUseCase } from "./sync-pandascore-teams.use-case";

describe(SyncPandascoreTeamsUseCase, () => {
  it("initializes from the source when no team exists", async () => {
    const roster = [{ currentTeam: null, player: { name: "Comm", pandascoreId: 2, slug: "comm" } }];

    const writer = {
      hasTeams: async () => false,
      syncCurrentTeams: vi.fn<CurrentRosterWriter["syncCurrentTeams"]>(),
    };

    await new SyncPandascoreTeamsUseCase(writer, { load: async () => roster }).seed();
    expect(writer.syncCurrentTeams).toHaveBeenCalledExactlyOnceWith(roster);
  });

  it("skips initialization when teams exist", async () => {
    const source = { load: vi.fn<CurrentRosterSource["load"]>() };

    const writer = {
      hasTeams: async () => true,
      syncCurrentTeams: vi.fn<CurrentRosterWriter["syncCurrentTeams"]>(),
    };

    await new SyncPandascoreTeamsUseCase(writer, source).seed();
    expect(source.load).not.toHaveBeenCalled();
    expect(writer.syncCurrentTeams).not.toHaveBeenCalled();
  });
});
