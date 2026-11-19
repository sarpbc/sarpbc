import type { FilterQuery, FindOptions } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";
import { unconstructed } from "../../../../test/doubles";
import { Team } from "./team.entity";
import { TeamAlias } from "./team-alias.entity";
import { MikroTeamStore } from "./team.store";

const fixture = (aliasTeamIds: string[]) => {
  const aliases = aliasTeamIds.map((id) =>
    Object.assign(new TeamAlias(), { team: Object.assign(new Team(), { id }) }),
  );

  const calls: [
    typeof Team | typeof TeamAlias,
    FilterQuery<Team | TeamAlias>,
    FindOptions<Team | TeamAlias>,
  ][] = [];

  const em = Object.assign(unconstructed(EntityManager), {
    find: async (
      entity: typeof Team | typeof TeamAlias,
      where: FilterQuery<Team | TeamAlias>,
      options: FindOptions<Team | TeamAlias>,
    ) => {
      calls.push([entity, where, options]);

      return entity === TeamAlias ? aliases : [];
    },
  });

  return { calls, teams: new MikroTeamStore(em) };
};

describe("MikroTeamStore.search", () => {
  it("also finds a team by a name it used before", async () => {
    const { calls, teams } = fixture(["renamed", "renamed", "other"]);

    await teams.search({ name: "origins" });

    expect(calls[0]).toStrictEqual([
      TeamAlias,
      { name: { $ilike: "%origins%" } },
      { fields: ["team"] },
    ]);
    expect(calls[1]?.[1]).toStrictEqual({
      $or: [{ name: { $ilike: "%origins%" } }, { id: { $in: ["renamed", "other"] } }],
      mergedInto: null,
    });
  });

  it("keeps the plain name filter when no alias matches and skips aliases without a name", async () => {
    const { calls, teams } = fixture([]);

    await teams.search({ name: "now" });
    expect(calls[1]?.[1]).toStrictEqual({ mergedInto: null, name: { $ilike: "%now%" } });

    calls.length = 0;
    await teams.search({ start: "F" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[0]).toBe(Team);
  });
});
