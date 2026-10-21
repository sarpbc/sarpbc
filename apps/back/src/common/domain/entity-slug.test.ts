import { describe, expect, it } from "vitest";
import {
  forumPostPath,
  forumPostSlug,
  matchPath,
  matchSlug,
  toSlug,
  tournamentSlugParts,
} from "@sarpbc/utils";

const BEGIN_2026 = new Date("2026-03-14T12:00:00Z");

describe("toSlug", () => {
  it("joins non-empty parts and normalizes accents and punctuation", () => {
    expect(toSlug("  Équipe de France ", null, "Paris: Open 6", undefined, "")).toBe(
      "equipe-de-france-paris-open-6",
    );
  });

  it("collapses repeated hyphens and trims them", () => {
    expect(toSlug("--a -- b--")).toBe("a-b");
  });

  it("returns an empty string when nothing slugifiable remains", () => {
    expect(toSlug("???", null)).toBe("");
  });

  it("caps long slugs at a hyphen boundary", () => {
    const slug = toSlug(Array.from({ length: 40 }, (_, i) => `word${i}`).join(" "));
    expect(slug.length).toBeLessThanOrEqual(120);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.split("-").every((word) => /^word\d+$/.test(word))).toBe(true);
  });
});

describe("tournamentSlugParts", () => {
  it("orders league, serie and stage", () => {
    expect(
      tournamentSlugParts({
        leagueName: "RLCS Major",
        serie: "Paris 2026",
        stageName: "Playoffs",
        beginAt: BEGIN_2026,
      }),
    ).toEqual(["RLCS Major", "Paris 2026", "Playoffs"]);
  });

  it("appends the year only when no year is already present", () => {
    expect(
      tournamentSlugParts({
        leagueName: "RLCS EU",
        serie: "Open",
        stageName: "Playoffs",
        beginAt: BEGIN_2026,
      }),
    ).toEqual(["RLCS EU", "Open", "Playoffs", "2026"]);
  });

  it("copes with a missing league, serie and begin date", () => {
    expect(
      tournamentSlugParts({ leagueName: null, serie: null, stageName: "Finals", beginAt: null }),
    ).toEqual(["Finals"]);
  });
});

describe("matchSlug", () => {
  const worlds = {
    leagueName: "RLCS World Championship",
    serie: "2026",
    stageName: "Group A",
    beginAt: BEGIN_2026,
  };

  it("names both teams when they are known", () => {
    expect(
      matchSlug({
        teamNames: ["Karmine Corp", "Team Falcons"],
        matchName: "Upper bracket final: Karmine Corp vs Team Falcons",
        tournament: { ...worlds, serie: "2026", stageName: "Playoffs" },
      }),
    ).toBe("karmine-corp-vs-team-falcons-rlcs-world-championship-2026-playoffs");
  });

  it("gives the same slug whichever order the teams arrive in", () => {
    const input = { matchName: "Final", tournament: worlds };
    const swapped = matchSlug({ ...input, teamNames: ["Team Falcons", "Karmine Corp"] });
    expect(swapped).toBe(matchSlug({ ...input, teamNames: ["Karmine Corp", "Team Falcons"] }));
    expect(swapped).toMatch(/^karmine-corp-vs-team-falcons-/);
  });

  it("falls back to the round label when a team is missing", () => {
    expect(
      matchSlug({
        teamNames: ["Karmine Corp", null],
        matchName: "Lower bracket round 2: Karmine Corp vs TBD",
        tournament: worlds,
      }),
    ).toBe("lower-bracket-round-2-rlcs-world-championship-2026-group-a");
  });

  it("treats a TBD team name as missing", () => {
    expect(
      matchSlug({
        teamNames: ["TBD", "TBD"],
        matchName: "Upper bracket final: TBD vs TBD",
        tournament: worlds,
      }),
    ).toBe("upper-bracket-final-rlcs-world-championship-2026-group-a");
  });

  it("uses no label for an unlabeled TBD match", () => {
    expect(
      matchSlug({ teamNames: [null, null], matchName: "TBD vs TBD", tournament: worlds }),
    ).toBe("rlcs-world-championship-2026-group-a");
  });

  it("keeps a colon-free label that is not a TBD placeholder", () => {
    expect(
      matchSlug({ teamNames: [null, null], matchName: "Grand Final", tournament: worlds }),
    ).toBe("grand-final-rlcs-world-championship-2026-group-a");
  });

  it("never returns an empty slug", () => {
    expect(
      matchSlug({
        teamNames: [null, null],
        matchName: "TBD",
        tournament: { leagueName: null, serie: null, stageName: null, beginAt: null },
      }),
    ).toBe("match");
  });
});

describe("forumPostSlug and path builders", () => {
  it("slugifies the title and falls back when it is not slugifiable", () => {
    expect(forumPostSlug("Mon Post: Quel ROSTER ?")).toBe("mon-post-quel-roster");
    expect(forumPostSlug("???")).toBe("post");
  });

  it("builds canonical paths", () => {
    expect(matchPath(7250, "a-vs-b")).toBe("/matches/7250/a-vs-b");
    expect(forumPostPath(88, "my-post-title")).toBe("/forum/post/88/my-post-title");
  });
});
