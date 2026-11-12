import { describe, expect, it } from "vitest";
import { Team } from "./roster";
import { TeamAlias, assertTeamAliasFits, teamAt } from "./team-alias";

function alias(fields: Partial<TeamAlias>): TeamAlias {
  return Object.assign(new TeamAlias(), { sourceUrl: "https://x.com/fixture/status/1" }, fields);
}

function fixtureTeam(): Team {
  return Object.assign(new Team(), {
    id: "team",
    name: "Fixture Now",
    slug: "fixture-now",
    imageUrl: "https://cdn.example/now.png",
    logoLightUrl: "https://cdn.example/now-light.webp",
    logoDarkUrl: "https://cdn.example/now-dark.webp",
    pandascoreId: 7,
    aliases: [
      alias({ id: "a1", name: "Fixture Origins", from: "2020-01-01", to: "2022-06-01" }),
      alias({
        id: "a2",
        name: "Fixture Sponsored",
        from: "2022-06-01",
        to: "2024-01-01",
        logoUrl: "https://cdn.example/sponsored.png",
      }),
    ],
  });
}

describe("teamAt", () => {
  it("shows the name in force on the date and keeps the team identity", () => {
    const team = fixtureTeam();
    const then = teamAt(team, new Date("2021-03-10T18:00:00Z"));

    expect(then).toMatchObject({
      id: "team",
      slug: "fixture-now",
      name: "Fixture Origins",
      logoLightUrl: "https://cdn.example/now-light.webp",
    });
    expect(team.name).toBe("Fixture Now");
  });

  it("uses the alias logo for both themes when it has one", () => {
    expect(teamAt(fixtureTeam(), new Date("2023-01-01T00:00:00Z"))).toMatchObject({
      name: "Fixture Sponsored",
      imageUrl: "https://cdn.example/sponsored.png",
      logoLightUrl: "https://cdn.example/sponsored.png",
      logoDarkUrl: null,
      darkModeImageUrl: null,
    });
  });

  it("keeps the current name outside every alias period or without a date", () => {
    const team = fixtureTeam();

    expect(teamAt(team, new Date("2024-01-01T00:00:00Z"))).toBe(team);
    expect(teamAt(team, new Date("2019-12-31T23:00:00Z"))).toBe(team);
    expect(teamAt(team, null)).toBe(team);
  });
});

describe("assertTeamAliasFits", () => {
  it("refuses a period that overlaps another alias of the team", () => {
    expect(() =>
      assertTeamAliasFits(alias({ name: "Overlap", from: "2022-01-01", to: null }), fixtureTeam()),
    ).toThrow('overlaps the alias "Fixture Origins"');
  });

  it("lets an alias keep its own period and refuses the team's own PandaScore id", () => {
    const team = fixtureTeam();
    const edited = alias({
      id: "a1",
      name: "Fixture Origins",
      from: "2019-01-01",
      to: "2022-06-01",
    });

    expect(() => assertTeamAliasFits(edited, team)).not.toThrow();
    expect(() =>
      assertTeamAliasFits(alias({ from: "2024-01-01", to: null, pandascoreId: 7 }), team),
    ).toThrow("already has PandaScore id 7");
  });
});
