import { describe, expect, it } from "vitest";
import { CreateCircuitDto, SetCircuitStageDto, UpdateCircuitDto } from "./circuit.dto";

const RULES = "https://example.org/rules";

describe(CreateCircuitDto, () => {
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

describe(UpdateCircuitDto, () => {
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

describe(SetCircuitStageDto, () => {
  const TEAM = "11111111-1111-4111-8111-111111111111";
  const stage = { scale: [{ from: 9, to: 12, points: 2 }], sourceUrl: RULES };

  it("accepts a worldwide flag, region teams and staff-entered final placements", () => {
    expect(
      SetCircuitStageDto.parse({
        ...stage,
        worldwide: true,
        regionTeamIds: [TEAM],
        finishes: [{ teamId: TEAM, placement: 9 }],
      }),
    ).toMatchObject({ worldwide: true, regionTeamIds: [TEAM] });
    expect(SetCircuitStageDto.safeParse(stage).success).toBe(true);
  });

  it("refuses team references that are not UUIDs and placements below 1", () => {
    for (const body of [
      { ...stage, regionTeamIds: ["kc"] },
      { ...stage, finishes: [{ teamId: TEAM, placement: 0 }] },
      { ...stage, finishes: [{ teamId: "kc", placement: 9 }] },
    ])
      expect(SetCircuitStageDto.safeParse(body).success).toBe(false);
  });
});
