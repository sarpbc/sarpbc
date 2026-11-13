import { describe, expect, it } from "vitest";
import { CreateCircuitDto, UpdateCircuitDto } from "./circuit.dto";

const RULES = "https://example.org/rules";

describe("CreateCircuitDto", () => {
  it("requires a season and an http(s) rules source", () => {
    expect(
      CreateCircuitDto.safeParse({ name: "RLCS", season: 2026, sourceUrl: RULES }).success,
    ).toBe(true);
    for (const body of [
      { name: "RLCS", sourceUrl: RULES },
      { name: "RLCS", season: null, sourceUrl: RULES },
      { name: "RLCS", season: 1999, sourceUrl: RULES },
      { name: "RLCS", season: 2026 },
      { name: "RLCS", season: 2026, sourceUrl: null },
      { name: "RLCS", season: 2026, sourceUrl: "" },
      { name: "RLCS", season: 2026, sourceUrl: "ftp://example.org/rules" },
    ])
      expect(CreateCircuitDto.safeParse(body).success).toBe(false);
  });
});

describe("UpdateCircuitDto", () => {
  it("leaves omitted fields unchanged, clears optional fields and keeps the season and source", () => {
    expect(UpdateCircuitDto.parse({ region: null, description: null })).toEqual({
      region: null,
      description: null,
    });
    expect(UpdateCircuitDto.safeParse({ season: null }).success).toBe(false);
    expect(UpdateCircuitDto.safeParse({ sourceUrl: null }).success).toBe(false);
    expect(UpdateCircuitDto.safeParse({ sourceUrl: "" }).success).toBe(false);
  });
});
