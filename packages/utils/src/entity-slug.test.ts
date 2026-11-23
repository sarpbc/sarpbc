import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { forumPostPath, matchPath, tournamentEventPath, tournamentStagePath } from "./entity-path";
import {
  allocateSlug,
  eventSlug,
  forumPostSlug,
  matchSlug,
  stageSlug,
  toSlug,
} from "./entity-slug";

void describe("toSlug", () => {
  void it("joins non-empty parts and normalizes accents and punctuation", () => {
    assert.equal(
      toSlug("  Équipe de France ", null, "Paris: Open 6", undefined, ""),
      "equipe-de-france-paris-open-6",
    );
  });

  void it("collapses repeated hyphens and trims them", () => {
    assert.equal(toSlug("--a -- b--"), "a-b");
  });

  void it("returns an empty string when nothing slugifiable remains", () => {
    assert.equal(toSlug("???", null), "");
  });

  void it("caps long slugs at a hyphen boundary", () => {
    const slug = toSlug(Array.from({ length: 40 }, (_, i) => `word${i}`).join(" "));
    assert.ok(slug.length <= 120);
    assert.equal(slug.endsWith("-"), false);
    assert.ok(slug.split("-").every((word) => /^word\d+$/u.test(word)));
  });
});

void describe("eventSlug", () => {
  void it("appends the year when the name carries none", () => {
    assert.equal(eventSlug("RLCS Major Paris", 2026), "rlcs-major-paris-2026");
    assert.equal(eventSlug("RLCS EU Paris: Open 6", 2026), "rlcs-eu-paris-open-6-2026");
  });

  void it("keeps a name that already carries a year as is", () => {
    assert.equal(eventSlug("RLCS Major Paris 2026", 2025), "rlcs-major-paris-2026");
    assert.equal(eventSlug("RLCS World Championship 2026", 2026), "rlcs-world-championship-2026");
  });

  void it("falls back when the name is not slugifiable", () => {
    assert.equal(eventSlug("???", null), "event");
    assert.equal(eventSlug("Community Cup", null), "community-cup");
  });
});

void describe("stageSlug", () => {
  void it("slugifies the stage name with a fallback", () => {
    assert.equal(stageSlug("Group Stage"), "group-stage");
    assert.equal(stageSlug("???"), "stage");
  });
});

void describe("allocateSlug", () => {
  void it("returns the base when it is free", async () => {
    assert.equal(await allocateSlug("playoffs", () => false), "playoffs");
  });

  void it("numbers taken slugs from 2 upward", async () => {
    const taken = new Set(["playoffs", "playoffs-2"]);
    assert.equal(await allocateSlug("playoffs", async (slug) => taken.has(slug)), "playoffs-3");
  });

  void it("never returns a UUID-shaped slug", async () => {
    const uuid = "0b6f2d3e-6c1a-4b8e-9a51-2f7c3d4e5a6b";
    assert.equal(await allocateSlug(uuid, () => false), `${uuid}-2`);
  });
});

void describe("matchSlug", () => {
  const worlds = { eventSlug: "rlcs-world-championship-2026", stageSlug: "group-a" };

  void it("names both teams when they are known", () => {
    assert.equal(
      matchSlug({
        matchName: "Upper bracket final: Karmine Corp vs Team Falcons",
        teamNames: ["Karmine Corp", "Team Falcons"],
        ...worlds,
        stageSlug: "playoffs",
      }),
      "karmine-corp-vs-team-falcons-rlcs-world-championship-2026-playoffs",
    );
  });

  void it("gives the same slug whichever order the teams arrive in", () => {
    const input = { matchName: "Final", ...worlds };
    const swapped = matchSlug({ ...input, teamNames: ["Team Falcons", "Karmine Corp"] });
    assert.equal(swapped, matchSlug({ ...input, teamNames: ["Karmine Corp", "Team Falcons"] }));
    assert.match(swapped, /^karmine-corp-vs-team-falcons-/u);
  });

  void it("drops the stage words the event slug already carries", () => {
    assert.equal(
      matchSlug({
        eventSlug: "coupe-de-france-slash-2026",
        matchName: "Round 1",
        stageSlug: "coupe-de-france-slash-group-stage-2026",
        teamNames: ["Vitality", "Gentle Mates"],
      }),
      "gentle-mates-vs-vitality-coupe-de-france-slash-2026-group-stage",
    );
  });

  void it("keeps a stage number the event slug happens to share", () => {
    assert.equal(
      matchSlug({
        eventSlug: "rlcs-2026-major-1",
        matchName: "Round 1",
        stageSlug: "day-1",
        teamNames: ["Vitality", "Gentle Mates"],
      }),
      "gentle-mates-vs-vitality-rlcs-2026-major-1-day-1",
    );
  });

  void it("falls back to the round label when a team is missing", () => {
    assert.equal(
      matchSlug({
        matchName: "Lower bracket round 2: Karmine Corp vs TBD",
        teamNames: ["Karmine Corp", null],
        ...worlds,
      }),
      "lower-bracket-round-2-rlcs-world-championship-2026-group-a",
    );
  });

  void it("treats a TBD team name as missing", () => {
    assert.equal(
      matchSlug({
        matchName: "Upper bracket final: TBD vs TBD",
        teamNames: ["TBD", "TBD"],
        ...worlds,
      }),
      "upper-bracket-final-rlcs-world-championship-2026-group-a",
    );
  });

  void it("uses no label for an unlabeled TBD match", () => {
    assert.equal(
      matchSlug({ matchName: "TBD vs TBD", teamNames: [null, null], ...worlds }),
      "rlcs-world-championship-2026-group-a",
    );
  });

  void it("keeps a colon-free label that is not a TBD placeholder", () => {
    assert.equal(
      matchSlug({ matchName: "Grand Final", teamNames: [null, null], ...worlds }),
      "grand-final-rlcs-world-championship-2026-group-a",
    );
  });

  void it("names a stage slugged like its event only once", () => {
    assert.equal(
      matchSlug({
        eventSlug: "community-cup",
        matchName: "Final",
        stageSlug: "community-cup",
        teamNames: ["A", "B"],
      }),
      "a-vs-b-community-cup",
    );
  });

  void it("never returns an empty slug", () => {
    assert.equal(
      matchSlug({ eventSlug: "", matchName: "TBD", stageSlug: "", teamNames: [null, null] }),
      "match",
    );
  });
});

void describe("forumPostSlug and path builders", () => {
  void it("slugifies the title and falls back when it is not slugifiable", () => {
    assert.equal(forumPostSlug("Mon Post: Quel ROSTER ?"), "mon-post-quel-roster");
    assert.equal(forumPostSlug("???"), "post");
  });

  void it("builds canonical paths", () => {
    assert.equal(matchPath(7250, "a-vs-b"), "/matches/7250/a-vs-b");
    assert.equal(forumPostPath(88, "my-post-title"), "/forum/post/88/my-post-title");
    assert.equal(
      tournamentEventPath("rlcs-major-paris-2026"),
      "/tournaments/rlcs-major-paris-2026",
    );
    assert.equal(
      tournamentStagePath("rlcs-major-paris-2026", "playoffs"),
      "/tournaments/rlcs-major-paris-2026/playoffs",
    );
  });
});
