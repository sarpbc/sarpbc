import { Player, Team } from "./player.entities";
import { RosterSyncWriter } from "./roster-sync.writer";
import type { EntityManager } from "@mikro-orm/postgresql";
describe("RosterSyncWriter", () => {
  const em = { findOne: jest.fn(), persist: jest.fn(), getReference: jest.fn() };
  const manager: Pick<EntityManager, "findOne" | "persist" | "getReference"> = em;
  beforeEach(() => {
    jest.clearAllMocks();
    em.findOne.mockResolvedValue(null);
    em.getReference.mockImplementation((entity, id) => Object.assign(new entity(), { id }));
  });
  it("updates a numeric identity and preserves local slug and current team on historical import", async () => {
    const team = Object.assign(new Team(), { id: "old", slug: "old-team" });
    const player = Object.assign(new Player(), {
      id: "p1",
      pandascoreId: 1,
      slug: "local-drufinho",
      team,
    });
    em.findOne.mockImplementation(async (entity, where) =>
      entity === Player && where.pandascoreId === 1 ? player : null,
    );
    await new RosterSyncWriter(manager).upsertPlayer({
      pandascoreId: 1,
      name: "Drufinho",
      slug: "renamed",
      nationality: "BR",
    });
    expect(player.slug).toBe("local-drufinho");
    expect(player.team).toBe(team);
    expect(player.nationality).toBe("BR");
  });
  it("changes or clears membership only for an explicit current-team operation", async () => {
    const player = Object.assign(new Player(), {
      id: "p2",
      pandascoreId: 2,
      slug: "comm",
      team: new Team(),
    });
    em.findOne.mockResolvedValue(player);
    const writer = new RosterSyncWriter(manager);
    await writer.upsertPlayer({ pandascoreId: 2, name: "Comm", slug: "comm" }, "new-team");
    expect(player.team?.id).toBe("new-team");
    await writer.upsertPlayer({ pandascoreId: 2, name: "Comm", slug: "comm" }, null);
    expect(player.team).toBeNull();
  });
  it("reuses new identities before commit rather than creating duplicate records", async () => {
    const writer = new RosterSyncWriter(manager);
    const input = { pandascoreId: 10, name: "Secret", slug: "secret" };
    const first = await writer.upsertTeam(input);
    const second = await writer.upsertTeam({ ...input, slug: "changed" });
    expect(second.id).toBe(first.id);
    const rows = em.persist.mock.calls.map((call) => call[0]);
    expect(rows[0]).toBe(rows[1]);
    expect(rows[0].slug).toBe("secret");
  });
  it("preserves local artwork", async () => {
    const team = Object.assign(new Team(), {
      id: "t",
      pandascoreId: 10,
      slug: "local",
      imageUrl: "local.png",
    });
    em.findOne.mockResolvedValue(team);
    await new RosterSyncWriter(manager).upsertTeam({
      pandascoreId: 10,
      name: "Secret",
      slug: "changed",
      imageUrl: "remote.png",
    });
    expect(team.slug).toBe("local");
    expect(team.imageUrl).toBe("local.png");
  });

  it("adopts a legacy slug only when the row has no provider identity", async () => {
    const player = Object.assign(new Player(), { id: "legacy", slug: "comm" });
    em.findOne.mockImplementation(async (entity, where) =>
      entity === Player && where.slug === "comm" && where.pandascoreId === null ? player : null,
    );
    const result = await new RosterSyncWriter(manager).upsertPlayer({
      pandascoreId: 2,
      name: "Comm",
      slug: "comm",
    });
    expect(result.id).toBe("legacy");
    expect(player.pandascoreId).toBe(2);
    expect(player.slug).toBe("comm");
  });

  it("suffixes a conflicting slug without overwriting a different provider identity", async () => {
    const other = Object.assign(new Player(), { id: "other", pandascoreId: 1, slug: "zen" });
    em.findOne.mockImplementation(async (entity, where) =>
      entity === Player && where.slug === "zen" && !("pandascoreId" in where) ? other : null,
    );
    const result = await new RosterSyncWriter(manager).upsertPlayer({
      pandascoreId: 2,
      name: "Zen",
      slug: "zen",
    });
    const created = em.persist.mock.calls[0][0];
    expect(result.id).not.toBe("other");
    expect(created.slug).toBe("zen-2");
    expect(created.pandascoreId).toBe(2);
    expect(other.pandascoreId).toBe(1);
    expect(other.slug).toBe("zen");
  });
});
