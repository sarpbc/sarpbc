import { beforeEach, describe, expect, it } from "vitest";
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

const matches = (row: Row, entity: EntityClass, where: Where) => {
  if (row instanceof Contract) {
    return entity === Contract && row.player.id === where.player && row.endDate === where.endDate;
  }

  return row instanceof entity && row.pandascoreId === where.pandascoreId;
};

const fakeEntityManager = () => {
  const rows: Row[] = [];
  const persisted: (Team | Player)[] = [];

  return {
    findOne: async (entity: EntityClass, where: Where) =>
      rows.find((row) => matches(row, entity, where)) ?? null,
    getReference: (entity: EntityClass, id: string) => Object.assign(new entity(), { id }),
    persist: (row: Team | Player) => {
      persisted.push(row);
    },
    persisted,
    rows,
  };
};

describe(RosterSyncWriter, () => {
  let em: ReturnType<typeof fakeEntityManager>;
  let manager: EntityManager;

  beforeEach(() => {
    em = fakeEntityManager();
    manager = Object.assign(unconstructed(EntityManager), em);
  });

  it("updates a numeric identity and preserves local slug and current team on historical import", async () => {
    const team = Object.assign(new Team(), { id: "old", slug: "old-team" });

    const player = Object.assign(new Player(), {
      id: "p1",
      pandascoreId: 1,
      slug: "local-drufinho",
      team,
    });

    em.rows.push(player);
    await new RosterSyncWriter(manager).upsertPlayer({
      name: "Drufinho",
      nationality: "BR",
      pandascoreId: 1,
      slug: "renamed",
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

    em.rows.push(player);
    const writer = new RosterSyncWriter(manager);
    await writer.upsertPlayer({ name: "Comm", pandascoreId: 2, slug: "comm" }, "new-team");
    expect(player.team?.id).toBe("new-team");
    await writer.upsertPlayer({ name: "Comm", pandascoreId: 2, slug: "comm" }, null);
    expect(player.team).toBeNull();
  });

  it("keeps the team of an open contract over the provider's current team", async () => {
    const team = Object.assign(new Team(), { id: "agg" });
    const player = Object.assign(new Player(), { id: "p3", pandascoreId: 3, slug: "joyo", team });
    const contract = Object.assign(new Contract(), { endDate: null, player, team });
    em.rows.push(player, contract);
    const writer = new RosterSyncWriter(manager);
    await writer.upsertPlayer({ name: "Joyo", pandascoreId: 3, slug: "joyo" }, null);
    expect(player.team).toBe(team);
    await writer.upsertPlayer({ name: "Joyo", pandascoreId: 3, slug: "joyo" }, "kaydop-corp");
    expect(player.team).toBe(team);
  });

  it("reuses new identities before commit rather than creating duplicate records", async () => {
    const writer = new RosterSyncWriter(manager);
    const input = { name: "Secret", pandascoreId: 10, slug: "secret" };
    const first = await writer.upsertTeam(input);
    const second = await writer.upsertTeam({ ...input, slug: "changed" });
    expect(second.id).toBe(first.id);
    const [firstRow, secondRow] = em.persisted;
    expect(firstRow).toBe(secondRow);
    expect(firstRow.slug).toBe("secret");
  });

  it("preserves local artwork", async () => {
    const team = Object.assign(new Team(), {
      id: "t",
      imageUrl: "local.png",
      pandascoreId: 10,
      slug: "local",
    });

    em.rows.push(team);
    await new RosterSyncWriter(manager).upsertTeam({
      imageUrl: "remote.png",
      name: "Secret",
      pandascoreId: 10,
      slug: "changed",
    });
    expect(team.slug).toBe("local");
    expect(team.imageUrl).toBe("local.png");
  });

  const upsertAliasedTeamTwice = async () => {
    const team = Object.assign(new Team(), {
      id: "current",
      name: "Fixture Now",
      pandascoreId: 20,
    });

    const alias = Object.assign(new TeamAlias(), { pandascoreId: 21, team });

    em.rows.push(alias);

    const writer = new RosterSyncWriter(manager);
    const input = { name: "Fixture Before", pandascoreId: 21, slug: "fixture-before" };

    return { results: [await writer.upsertTeam(input), await writer.upsertTeam(input)], team };
  };

  it("maps a PandaScore team named in an alias to the aliased team", async () => {
    const { results } = await upsertAliasedTeamTwice();

    expect(results).toStrictEqual([{ id: "current" }, { id: "current" }]);
  });

  it("does not touch the aliased team", async () => {
    const { team } = await upsertAliasedTeamTwice();

    expect(team.name).toBe("Fixture Now");
    expect(team.pandascoreId).toBe(20);
    expect(em.persisted).toStrictEqual([]);
  });
});
