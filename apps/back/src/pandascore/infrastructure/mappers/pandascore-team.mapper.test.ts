import { describe, expect, it } from "vitest";
import { toUpsertTeamCommand } from "./pandascore-team.mapper";
import { teamSchema } from "../dto/tournament.dto";

describe("PandascoreTeamMapper", () => {
  it("maps dark_mode_image_url onto the upsert command", () => {
    const dto = teamSchema.parse({
      acronym: "VIT",
      dark_mode_image_url: "https://example.com/vitality-dark.png",
      id: 7,
      image_url: "https://example.com/vitality-light.png",
      location: "FR",
      modified_at: "2025-01-01T00:00:00Z",
      name: "Team Vitality",
      slug: "team-vitality",
    });

    expect(toUpsertTeamCommand(dto)).toStrictEqual({
      darkModeImageUrl: "https://example.com/vitality-dark.png",
      imageUrl: "https://example.com/vitality-light.png",
      location: "FR",
      name: "Team Vitality",
      pandascoreId: 7,
      slug: "team-vitality",
    });
  });
});
