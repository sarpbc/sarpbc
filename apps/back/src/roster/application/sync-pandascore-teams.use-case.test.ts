import { describe, expect, it, vi } from "vitest";
import { SyncPandascoreTeamsUseCase } from "./sync-pandascore-teams.use-case";

describe(SyncPandascoreTeamsUseCase, () => {
  it("initializes from the source when no team exists", async () => {
    const roster = [{ player: { pandascoreId: 2, name: "Comm", slug: "comm" }, currentTeam: null }];
    const writer = { hasTeams: async () => false, syncCurrentTeams: vi.fn() };
    await new SyncPandascoreTeamsUseCase(writer, { load: async () => roster }).seed();
    expect(writer.syncCurrentTeams).toHaveBeenCalledOnce();
  });

  it("skips initialization when teams exist", async () => {
    const source = { load: vi.fn() };
    const writer = { hasTeams: async () => true, syncCurrentTeams: vi.fn() };
    await new SyncPandascoreTeamsUseCase(writer, source).seed();
    expect(source.load).not.toHaveBeenCalled();
    expect(writer.syncCurrentTeams).not.toHaveBeenCalled();
  });
});
