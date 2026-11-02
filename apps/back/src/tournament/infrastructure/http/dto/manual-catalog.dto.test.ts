import { describe, expect, it } from "vitest";
import { CreateLeagueDto, UpdateEventDto, UpdateLeagueDto } from "./manual-catalog.dto";

describe("manual catalog DTOs", () => {
  it("rejects an update that changes nothing", () => {
    expect(UpdateEventDto.safeParse({}).success).toBe(false);
    expect(UpdateLeagueDto.safeParse({}).success).toBe(false);
  });

  it("accepts null to clear an event league or league fields", () => {
    expect(UpdateEventDto.parse({ leagueId: null })).toEqual({
      leagueId: null,
    });
    expect(UpdateLeagueDto.parse({ slug: null, url: null, imageUrl: null })).toEqual({
      slug: null,
      url: null,
      imageUrl: null,
    });
  });

  it("rejects unknown fields and non-http URLs", () => {
    expect(CreateLeagueDto.safeParse({ name: "CDF", source: "manual" }).success).toBe(false);
    expect(CreateLeagueDto.safeParse({ name: "CDF", url: "javascript:alert(1)" }).success).toBe(
      false,
    );
    expect(CreateLeagueDto.parse({ name: " CDF ", url: "https://cdf.gg" })).toEqual({
      name: "CDF",
      url: "https://cdf.gg",
    });
  });
});
