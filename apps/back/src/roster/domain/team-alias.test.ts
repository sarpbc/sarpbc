import { describe, expect, it } from "vitest";
import { Team } from "./team";
import { TeamAlias, assertTeamAliasFits, teamAt } from "./team-alias";

const alias = (fields: Partial<TeamAlias>) =>
  Object.assign(new TeamAlias(), { sourceUrl: "https://x.com/fixture/status/1" }, fields);

const fixtureTeam = () =>
  Object.assign(new Team(), {
    aliases: [
      alias({ from: "2020-01-01", id: "a1", name: "Fixture Origins", to: "2022-06-01" }),
      alias({
        from: "2022-06-01",
        id: "a2",
        logoUrl: "https://cdn.example/sponsored.png",
        name: "Fixture Sponsored",
        to: "2024-01-01",
      }),
    ],
    id: "team",
    imageUrl: "https://cdn.example/now.png",
    logoDarkUrl: "https://cdn.example/now-dark.webp",
    logoLightUrl: "https://cdn.example/now-light.webp",
    name: "Fixture Now",
    pandascoreId: 7,
    slug: "fixture-now",
  });

describe(teamAt, () => {
  it("shows the name in force on the date and keeps the team identity", () => {
    const team = fixtureTeam();
    const then = teamAt(team, new Date("2021-03-10T18:00:00Z"));

    expect(then).toMatchObject({
      id: "team",
      logoLightUrl: "https://cdn.example/now-light.webp",
      name: "Fixture Origins",
      slug: "fixture-now",
    });
    expect(team.name).toBe("Fixture Now");
  });

  it("uses the alias logo for both themes when it has one", () => {
    expect(teamAt(fixtureTeam(), new Date("2023-01-01T00:00:00Z"))).toMatchObject({
      darkModeImageUrl: null,
      imageUrl: "https://cdn.example/sponsored.png",
      logoDarkUrl: null,
      logoLightUrl: "https://cdn.example/sponsored.png",
      name: "Fixture Sponsored",
    });
  });

  it("keeps the current name outside every alias period or without a date", () => {
    const team = fixtureTeam();

    expect(teamAt(team, new Date("2024-01-01T00:00:00Z"))).toBe(team);
    expect(teamAt(team, new Date("2019-12-31T23:00:00Z"))).toBe(team);
    expect(teamAt(team, null)).toBe(team);
  });
});

describe(assertTeamAliasFits, () => {
  it("refuses a period that overlaps another alias of the team", () => {
    expect(() => {
      assertTeamAliasFits(alias({ from: "2022-01-01", name: "Overlap", to: null }), fixtureTeam());
    }).toThrow('overlaps the alias "Fixture Origins"');
  });

  it("lets an alias keep its own period and refuses the team's own PandaScore id", () => {
    const team = fixtureTeam();

    const edited = alias({
      from: "2019-01-01",
      id: "a1",
      name: "Fixture Origins",
      to: "2022-06-01",
    });

    expect(() => {
      assertTeamAliasFits(edited, team);
    }).not.toThrow();
    expect(() => {
      assertTeamAliasFits(alias({ from: "2024-01-01", pandascoreId: 7, to: null }), team);
    }).toThrow("already has PandaScore id 7");
  });
});
