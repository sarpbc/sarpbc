import { beforeEach, describe, expect, it, vi } from "vitest";
import { Contract } from "./contract.entity";
import { Player } from "./player.entity";
import { Team } from "./team.entity";
import { TeamAlias } from "./team-alias.entity";
import { RosterSyncWriter } from "./roster-sync.writer";
import { EntityManager } from "@mikro-orm/postgresql";
import { unconstructed } from "../../../../test/doubles";

type EntityClass = new () => object;

type Row = Player | Team | TeamAlias | Contract;

interface Where {
  pandascoreId?: number;
  player?: string;
  endDate?: Date | null;
}

describe(RosterSyncWriter, () => {
  const em = {
    findOne: vi.fn<(entity: EntityClass, where: Where) => Promise<Row | null>>(),
    persist: vi.fn<(row: Team | Player) => void>(),
    getReference: vi.fn<(entity: EntityClass, id: string) => object>(),
  };

  const manager = Object.assign(unconstructed(EntityManager), em);

  beforeEach(() => {
    vi.clearAllMocks();
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

    em.findOne.mockImplementation(async (entity) => (entity === Player ? player : null));
    const writer = new RosterSyncWriter(manager);
    await writer.upsertPlayer({ pandascoreId: 2, name: "Comm", slug: "comm" }, "new-team");
    expect(player.team?.id).toBe("new-team");
    await writer.upsertPlayer({ pandascoreId: 2, name: "Comm", slug: "comm" }, null);
    expect(player.team).toBeNull();
  });

  it("keeps the team of an open contract over the provider's current team", async () => {
    const team = Object.assign(new Team(), { id: "agg" });
    const player = Object.assign(new Player(), { id: "p3", pandascoreId: 3, slug: "joyo", team });
    const contract = Object.assign(new Contract(), { player, team, endDate: null });
    em.findOne.mockImplementation(async (entity, where) => {
      if (entity === Player && where.pandascoreId === 3) {
        return player;
      }

      if (entity === Contract && where.player === "p3" && where.endDate === null) {
        return contract;
      }

      return null;
    });
    const writer = new RosterSyncWriter(manager);
    await writer.upsertPlayer({ pandascoreId: 3, name: "Joyo", slug: "joyo" }, null);
    expect(player.team).toBe(team);
    await writer.upsertPlayer({ pandascoreId: 3, name: "Joyo", slug: "joyo" }, "kaydop-corp");
    expect(player.team).toBe(team);
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

  async function upsertAliasedTeamTwice() {
    const team = Object.assign(new Team(), {
      id: "current",
      name: "Fixture Now",
      pandascoreId: 20,
    });

    const alias = Object.assign(new TeamAlias(), { pandascoreId: 21, team });

    em.findOne.mockImplementation(async (entity, where) =>
      entity === TeamAlias && where.pandascoreId === 21 ? alias : null,
    );

    const writer = new RosterSyncWriter(manager);
    const input = { pandascoreId: 21, name: "Fixture Before", slug: "fixture-before" };

    return { team, results: [await writer.upsertTeam(input), await writer.upsertTeam(input)] };
  }

  it("maps a PandaScore team named in an alias to the aliased team", async () => {
    const { results } = await upsertAliasedTeamTwice();

    expect(results).toStrictEqual([{ id: "current" }, { id: "current" }]);
  });

  it("does not touch the aliased team", async () => {
    const { team } = await upsertAliasedTeamTwice();

    expect(team.name).toBe("Fixture Now");
    expect(team.pandascoreId).toBe(20);
    expect(em.persist).not.toHaveBeenCalled();
  });

  it("looks the alias up once for repeated upserts", async () => {
    await upsertAliasedTeamTwice();

    expect(em.findOne.mock.calls.filter(([entity]) => entity === TeamAlias)).toHaveLength(1);
  });
});
