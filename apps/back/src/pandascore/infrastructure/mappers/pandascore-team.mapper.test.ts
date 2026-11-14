import { describe, expect, it } from "vitest";
import { toUpsertTeamCommand } from "./pandascore-team.mapper";
import { teamSchema } from "../dto/tournament.dto";

describe("PandascoreTeamMapper", () => {
  it("maps dark_mode_image_url onto the upsert command", () => {
    const dto = teamSchema.parse({
      id: 7,
      name: "Team Vitality",
      slug: "team-vitality",
      location: "FR",
      modified_at: "2025-01-01T00:00:00Z",
      acronym: "VIT",
      image_url: "https://example.com/vitality-light.png",
      dark_mode_image_url: "https://example.com/vitality-dark.png",
    });

    expect(toUpsertTeamCommand(dto)).toStrictEqual({
      pandascoreId: 7,
      name: "Team Vitality",
      slug: "team-vitality",
      location: "FR",
      imageUrl: "https://example.com/vitality-light.png",
      darkModeImageUrl: "https://example.com/vitality-dark.png",
    });
  });
});
