import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import {
  assertBracketLinks,
  assertManualBracketMatch,
  emptySingleEliminationBracket,
} from "./bracket";
import type { StageBracket } from "./bracket";

const stage = (): StageBracket => ({
  hasBracket: true,
  matches: [
    { id: "semi-1", previousMatches: [] },
    { id: "semi-2", previousMatches: [] },
    { id: "final", previousMatches: [] },
    { id: "third", previousMatches: [] },
  ],
});

describe("bracket links", () => {
  const semis = [
    { previousMatchId: "semi-1", type: "winner" },
    { previousMatchId: "semi-2", type: "winner" },
  ] as const;

  it("links two semifinals into a final", () => {
    expect(() => {
      assertBracketLinks("final", [...semis], stage());
    }).not.toThrow();
  });

  it("accepts clearing the links of a stage without a bracket", () => {
    expect(() => {
      assertBracketLinks("final", [], { ...stage(), hasBracket: false });
    }).not.toThrow();
  });

  it("refuses links on a stage without a bracket", () => {
    expect(() => {
      assertBracketLinks("final", [...semis], { ...stage(), hasBracket: false });
    }).toThrow(/hasBracket/);
  });

  it("refuses a previous match from another stage", () => {
    expect(() => {
      assertBracketLinks("final", [{ previousMatchId: "elsewhere", type: "winner" }], stage());
    }).toThrow(/same stage/);
  });

  it("refuses more than two incoming links", () => {
    expect(() => {
      assertBracketLinks(
        "final",
        [...semis, { previousMatchId: "third", type: "winner" }],
        stage(),
      );
    }).toThrow(/at most 2/);
  });

  it("refuses the same previous match twice and a match feeding itself", () => {
    expect(() => {
      assertBracketLinks(
        "final",
        [
          { previousMatchId: "semi-1", type: "winner" },
          { previousMatchId: "semi-1", type: "loser" },
        ],
        stage(),
      );
    }).toThrow(InvalidInputError);
    expect(() => {
      assertBracketLinks("final", [{ previousMatchId: "final", type: "winner" }], stage());
    }).toThrow(/itself/);
  });

  it("refuses a cycle", () => {
    const linked = stage();
    linked.matches = linked.matches.map((match) =>
      match.id === "final" ? { ...match, previousMatches: [...semis] } : match,
    );
    expect(() => {
      assertBracketLinks("semi-1", [{ previousMatchId: "final", type: "loser" }], linked);
    }).toThrow(/cycle/);
  });

  it("refuses a winner already sent to another match", () => {
    const linked = stage();
    linked.matches = linked.matches.map((match) =>
      match.id === "final" ? { ...match, previousMatches: [...semis] } : match,
    );
    expect(() => {
      assertBracketLinks("third", [{ previousMatchId: "semi-1", type: "winner" }], linked);
    }).toThrow(/already goes/);
    expect(() => {
      assertBracketLinks(
        "third",
        [
          { previousMatchId: "semi-1", type: "loser" },
          { previousMatchId: "semi-2", type: "loser" },
        ],
        linked,
      );
    }).not.toThrow();
  });

  it("lets a match keep its own links when they are resent", () => {
    const linked = stage();
    linked.matches = linked.matches.map((match) =>
      match.id === "final" ? { ...match, previousMatches: [...semis] } : match,
    );
    expect(() => {
      assertBracketLinks("final", [...semis], linked);
    }).not.toThrow();
  });
});

describe("PandaScore bracket data", () => {
  const manual = {
    source: "manual",
    pandascoreId: null,
    tournament: { source: "manual" },
  } as const;

  it("accepts a manual match of a manual stage", () => {
    expect(() => {
      assertManualBracketMatch(manual);
    }).not.toThrow();
  });

  it("refuses a PandaScore match or a match of a PandaScore stage", () => {
    expect(() => {
      assertManualBracketMatch({ ...manual, pandascoreId: 12 });
    }).toThrow(/PandaScore/);
    expect(() => {
      assertManualBracketMatch({ ...manual, source: "pandascore" });
    }).toThrow(/PandaScore/);
    expect(() => {
      assertManualBracketMatch({ ...manual, tournament: { source: "pandascore" } });
    }).toThrow(/PandaScore/);
  });
});

describe("empty single-elimination bracket", () => {
  it("builds two semifinals feeding a grand final for four teams", () => {
    expect(emptySingleEliminationBracket(4)).toStrictEqual([
      { name: "Semifinal 1", previousMatches: [] },
      { name: "Semifinal 2", previousMatches: [] },
      {
        name: "Grand Final",
        previousMatches: [
          { index: 0, type: "winner" },
          { index: 1, type: "winner" },
        ],
      },
    ]);
  });

  it("builds seven matches for eight teams, each round fed by the previous one", () => {
    const matches = emptySingleEliminationBracket(8);
    expect(matches.map((match) => match.name)).toStrictEqual([
      "Quarterfinal 1",
      "Quarterfinal 2",
      "Quarterfinal 3",
      "Quarterfinal 4",
      "Semifinal 1",
      "Semifinal 2",
      "Grand Final",
    ]);
    expect(matches[5]?.previousMatches).toStrictEqual([
      { index: 2, type: "winner" },
      { index: 3, type: "winner" },
    ]);
  });

  it("builds fifteen matches for sixteen teams", () => {
    expect(emptySingleEliminationBracket(16)).toHaveLength(15);
  });
});
