import { MikroORM } from "@mikro-orm/postgresql";
import { describe, expect, it, vi } from "vitest";
import { mikroOrmEntities } from "../../../mikro-orm.entities";
import { Team, TeamAlias } from "./player.entities";
import { MikroTeamStore } from "./roster.store";

const orm = new MikroORM({
  entities: mikroOrmEntities,
  dbName: "team-search-test",
  allowGlobalContext: true,
});

function fixture(aliasTeamIds: string[]) {
  const em = orm.em.fork();
  const aliases = aliasTeamIds.map((id) =>
    Object.assign(new TeamAlias(), { team: Object.assign(new Team(), { id }) }),
  );
  const find = vi.spyOn(em, "find");
  find.mockResolvedValueOnce(aliases).mockResolvedValueOnce([]);
  return { find, teams: new MikroTeamStore(em) };
}

describe("MikroTeamStore.search", () => {
  it("also finds a team by a name it used before", async () => {
    const { find, teams } = fixture(["renamed", "renamed", "other"]);

    await teams.search({ name: "origins" });

    expect(find).toHaveBeenNthCalledWith(
      1,
      TeamAlias,
      { name: { $ilike: "%origins%" } },
      { fields: ["team"] },
    );
    expect(find.mock.calls[1]?.[1]).toEqual({
      mergedInto: null,
      $or: [{ name: { $ilike: "%origins%" } }, { id: { $in: ["renamed", "other"] } }],
    });
  });

  it("keeps the plain name filter when no alias matches and skips aliases without a name", async () => {
    const { find, teams } = fixture([]);

    await teams.search({ name: "now" });
    expect(find.mock.calls[1]?.[1]).toEqual({ name: { $ilike: "%now%" }, mergedInto: null });

    find.mockClear();
    find.mockResolvedValueOnce([]);
    await teams.search({ start: "F" });
    expect(find).toHaveBeenCalledOnce();
    expect(find.mock.calls[0]?.[0]).toBe(Team);
  });
});
