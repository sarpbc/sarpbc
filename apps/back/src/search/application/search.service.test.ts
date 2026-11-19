import { describe, expect, it } from "vitest";
import { Player } from "../../roster/domain/player";
import { Team } from "../../roster/domain/team";
import { Tournament } from "../../tournament/domain/tournament";
import { InMemorySearchSource } from "./search.test-utils";
import { SearchService } from "./search.service";

const ROWS = ["a", "b", "c", "x", "d", "e", "f"].map((id) => ({
  id,
  name: id === "x" ? "Other" : `RL ${id}`,
}));

const service = new SearchService(
  new InMemorySearchSource(ROWS.map((row) => Object.assign(new Player(), row))),
  new InMemorySearchSource(ROWS.map((row) => Object.assign(new Team(), row))),
  new InMemorySearchSource(ROWS.map((row) => Object.assign(new Tournament(), row))),
);

const ids = (rows: { id: string }[]) => rows.map(({ id }) => id);

describe(SearchService, () => {
  it("splits an odd page across every kind of an all search without losing a row", async () => {
    const result = await service.search({ limit: 5, offset: 3, query: "rl", type: "all" });

    expect(ids(result.players)).toStrictEqual(["b", "c", "d"]);
    expect(ids(result.teams)).toStrictEqual(["b", "c", "d"]);
    expect(ids(result.tournaments)).toStrictEqual(["b", "c", "d"]);
    expect(result.total).toStrictEqual({ players: 3, teams: 3, tournaments: 3 });
  });

  it.each([
    ["player", { players: 4, teams: 0, tournaments: 0 }],
    ["team", { players: 0, teams: 4, tournaments: 0 }],
    ["tournament", { players: 0, teams: 0, tournaments: 4 }],
  ] as const)("searches only %ss, with the whole page", async (type, total) => {
    const result = await service.search({ limit: 4, offset: 1, query: "rl", type });

    expect(result.total).toStrictEqual(total);
    expect(
      [...result.players, ...result.teams, ...result.tournaments].map(({ id }) => id),
    ).toStrictEqual(["b", "c", "d", "e"]);
  });
});
