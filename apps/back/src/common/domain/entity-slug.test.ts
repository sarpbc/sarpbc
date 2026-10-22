import { describe, expect, it } from "vitest";
import {
  allocateSlug,
  eventSlug,
  forumPostPath,
  forumPostSlug,
  matchPath,
  matchSlug,
  stageSlug,
  toSlug,
  tournamentEventPath,
  tournamentStagePath,
} from "@sarpbc/utils";

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

describe("eventSlug", () => {
  it("appends the year when the name carries none", () => {
    expect(eventSlug("RLCS Major Paris", 2026)).toBe("rlcs-major-paris-2026");
    expect(eventSlug("RLCS EU Paris: Open 6", 2026)).toBe("rlcs-eu-paris-open-6-2026");
  });

  it("keeps a name that already carries a year as is", () => {
    expect(eventSlug("RLCS Major Paris 2026", 2025)).toBe("rlcs-major-paris-2026");
    expect(eventSlug("RLCS World Championship 2026", 2026)).toBe("rlcs-world-championship-2026");
  });

  it("falls back when the name is not slugifiable", () => {
    expect(eventSlug("???", null)).toBe("event");
    expect(eventSlug("Community Cup", null)).toBe("community-cup");
  });
});

describe("stageSlug", () => {
  it("slugifies the stage name with a fallback", () => {
    expect(stageSlug("Group Stage")).toBe("group-stage");
    expect(stageSlug("???")).toBe("stage");
  });
});

describe("allocateSlug", () => {
  it("returns the base when it is free", async () => {
    expect(await allocateSlug("playoffs", () => false)).toBe("playoffs");
  });

  it("numbers taken slugs from 2 upward", async () => {
    const taken = new Set(["playoffs", "playoffs-2"]);
    expect(await allocateSlug("playoffs", async (slug) => taken.has(slug))).toBe("playoffs-3");
  });

  it("never returns a UUID-shaped slug", async () => {
    const uuid = "0b6f2d3e-6c1a-4b8e-9a51-2f7c3d4e5a6b";
    expect(await allocateSlug(uuid, () => false)).toBe(`${uuid}-2`);
  });
});

describe("matchSlug", () => {
  const worlds = { eventSlug: "rlcs-world-championship-2026", stageSlug: "group-a" };

  it("names both teams when they are known", () => {
    expect(
      matchSlug({
        teamNames: ["Karmine Corp", "Team Falcons"],
        matchName: "Upper bracket final: Karmine Corp vs Team Falcons",
        ...worlds,
        stageSlug: "playoffs",
      }),
    ).toBe("karmine-corp-vs-team-falcons-rlcs-world-championship-2026-playoffs");
  });

  it("gives the same slug whichever order the teams arrive in", () => {
    const input = { matchName: "Final", ...worlds };
    const swapped = matchSlug({ ...input, teamNames: ["Team Falcons", "Karmine Corp"] });
    expect(swapped).toBe(matchSlug({ ...input, teamNames: ["Karmine Corp", "Team Falcons"] }));
    expect(swapped).toMatch(/^karmine-corp-vs-team-falcons-/);
  });

  it("falls back to the round label when a team is missing", () => {
    expect(
      matchSlug({
        teamNames: ["Karmine Corp", null],
        matchName: "Lower bracket round 2: Karmine Corp vs TBD",
        ...worlds,
      }),
    ).toBe("lower-bracket-round-2-rlcs-world-championship-2026-group-a");
  });

  it("treats a TBD team name as missing", () => {
    expect(
      matchSlug({
        teamNames: ["TBD", "TBD"],
        matchName: "Upper bracket final: TBD vs TBD",
        ...worlds,
      }),
    ).toBe("upper-bracket-final-rlcs-world-championship-2026-group-a");
  });

  it("uses no label for an unlabeled TBD match", () => {
    expect(matchSlug({ teamNames: [null, null], matchName: "TBD vs TBD", ...worlds })).toBe(
      "rlcs-world-championship-2026-group-a",
    );
  });

  it("keeps a colon-free label that is not a TBD placeholder", () => {
    expect(matchSlug({ teamNames: [null, null], matchName: "Grand Final", ...worlds })).toBe(
      "grand-final-rlcs-world-championship-2026-group-a",
    );
  });

  it("never returns an empty slug", () => {
    expect(
      matchSlug({ teamNames: [null, null], matchName: "TBD", eventSlug: "", stageSlug: "" }),
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
    expect(tournamentEventPath("rlcs-major-paris-2026")).toBe("/tournaments/rlcs-major-paris-2026");
    expect(tournamentStagePath("rlcs-major-paris-2026", "playoffs")).toBe(
      "/tournaments/rlcs-major-paris-2026/playoffs",
    );
  });
});
