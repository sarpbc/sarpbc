import { describe, expect, it } from "vitest";
import {
  formatTrophyHighlightNames,
  tournamentEventDisplayName,
} from "./tournamentEventDisplayName";

describe("tournamentEventDisplayName", () => {
  it("joins league and serie when serie omits the league name", () => {
    expect(
      tournamentEventDisplayName({
        name: "Playoffs",
        leagueName: "RLCS Major",
        serie: "Paris 2026",
      }),
    ).toBe("RLCS Major Paris 2026");
  });

  it("prefers serie when it already includes the league name", () => {
    expect(
      tournamentEventDisplayName({
        name: "Playoffs",
        leagueName: "RLCS",
        serie: "RLCS Major Paris 2026",
      }),
    ).toBe("RLCS Major Paris 2026");
  });

  it("prefixes league for colon-formatted serie names", () => {
    expect(
      tournamentEventDisplayName({
        name: "Playoffs",
        leagueName: "RLCS EU",
        serie: "Boston Major: Open 2 2026",
      }),
    ).toBe("RLCS EU Boston Major: Open 2 2026");
  });

  it("joins league and year-only serie instead of returning the year alone", () => {
    expect(
      tournamentEventDisplayName({
        name: "Playoffs",
        leagueName: "FIFAe World Cup",
        serie: "2025",
      }),
    ).toBe("FIFAe World Cup 2025");
  });

  it("falls back to league and stage when serie is missing", () => {
    expect(
      tournamentEventDisplayName({
        name: "World Championship",
        leagueName: "RLCS",
        serie: null,
      }),
    ).toBe("RLCS World Championship");
  });

  it("falls back to the stage name alone", () => {
    expect(
      tournamentEventDisplayName({
        name: "Showmatch",
        leagueName: undefined,
        serie: null,
      }),
    ).toBe("Showmatch");
  });
});

describe("formatTrophyHighlightNames", () => {
  it("dedupes and returns the most recent trophies first", () => {
    expect(
      formatTrophyHighlightNames([
        {
          displayName: "RLCS Major Paris 2026",
          endAt: "2026-05-24T19:17:00.000Z",
        },
        {
          displayName: "RLCS EU Boston Major: Open 2 2026",
          endAt: "2026-01-18T21:20:00.000Z",
        },
        {
          displayName: "FIFAe World Cup 2025",
          endAt: "2025-12-19T00:00:00.000Z",
        },
        {
          displayName: "RLCS Major Paris 2026",
          endAt: "2026-05-24T19:17:00.000Z",
        },
      ]),
    ).toBe("RLCS Major Paris 2026, RLCS EU Boston Major: Open 2 2026, FIFAe World Cup 2025");
  });
});
