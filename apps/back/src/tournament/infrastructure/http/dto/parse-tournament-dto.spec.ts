import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { CreateTournamentDto, UpdateTournamentDto } from "./create-tournament.dto";
import { parseDto } from "./parse-tournament-dto";

describe("MCP tournament input", () => {
  it("uses the HTTP schema transformations and preserves null clears", () => {
    expect(parseDto(CreateTournamentDto, { name: "  RLCS  ", tier: " S " })).toEqual({
      name: "RLCS",
      tier: "S",
    });
    expect(
      parseDto(UpdateTournamentDto, { beginAt: null, endAt: null, leagueId: null, imageUrl: "  " }),
    ).toEqual({ beginAt: null, endAt: null, leagueId: null, imageUrl: "" });
  });

  it.each([
    {},
    { name: " " },
    { name: "RLCS", beginAt: "invalid" },
    { name: "RLCS", unexpected: true },
    {
      name: "RLCS",
      teamIds: ["11111111-1111-4111-8111-111111111111", "11111111-1111-4111-8111-111111111111"],
    },
  ])("returns a bad request for invalid MCP input %j", (input) => {
    expect(() => parseDto(CreateTournamentDto, input)).toThrow(BadRequestException);
  });
});
