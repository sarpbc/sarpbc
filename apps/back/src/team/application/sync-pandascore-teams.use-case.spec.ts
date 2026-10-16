import { SyncPandascoreTeamsUseCase } from "./sync-pandascore-teams.use-case";
describe("SyncPandascoreTeamsUseCase", () => {
  it("passes current team assignment separately from historical imports", async () => {
    const roster = [
      {
        player: {
          pandascoreId: 1,
          name: "Drufinho",
          slug: "drufinho-renamed",
          nationality: "BR",
          imageUrl: "https://cdn.pandascore.co/drufinho.png",
        },
        team: { pandascoreId: 10, name: "Team Secret", slug: "team-secret-rl" },
      },
      { player: { pandascoreId: 2, name: "Comm", slug: "comm" }, team: null },
    ];
    const writer = {
      hasTeams: async () => false,
      syncCurrentTeams: jest.fn().mockResolvedValue(undefined),
    };
    await new SyncPandascoreTeamsUseCase(writer, { load: async () => roster }).execute(false);
    expect(writer.syncCurrentTeams).toHaveBeenCalledWith(roster);
  });
  it("skips initialization when teams exist", async () => {
    const source = { load: jest.fn() };
    const writer = { hasTeams: async () => true, syncCurrentTeams: jest.fn() };
    await new SyncPandascoreTeamsUseCase(writer, source).execute(true);
    expect(source.load).not.toHaveBeenCalled();
    expect(writer.syncCurrentTeams).not.toHaveBeenCalled();
  });
});
