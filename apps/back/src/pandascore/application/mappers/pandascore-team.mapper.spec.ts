import { PandascoreTeamMapper } from "./pandascore-team.mapper";
import { TeamDto } from "../../infrastructure/dto/tournament.dto";

describe("PandascoreTeamMapper", () => {
  it("maps dark_mode_image_url onto the upsert command", () => {
    const dto = {
      id: 7,
      name: "Team Vitality",
      slug: "team-vitality",
      location: "FR",
      modified_at: "2025-01-01T00:00:00Z",
      acronym: "VIT",
      image_url: "https://example.com/vitality-light.png",
      dark_mode_image_url: "https://example.com/vitality-dark.png",
    } as TeamDto;

    expect(PandascoreTeamMapper.toUpsertCommand(dto)).toEqual({
      pandascoreId: 7,
      name: "Team Vitality",
      slug: "team-vitality",
      location: "FR",
      imageUrl: "https://example.com/vitality-light.png",
      darkModeImageUrl: "https://example.com/vitality-dark.png",
    });
  });

  it("omits darkModeImageUrl when PandaScore has no dark variant", () => {
    expect(
      PandascoreTeamMapper.fromCurrentTeam({
        id: 7,
        name: "Team Vitality",
        slug: "team-vitality",
        image_url: "https://example.com/vitality.png",
        dark_mode_image_url: null,
      }),
    ).toEqual({
      pandascoreId: 7,
      name: "Team Vitality",
      slug: "team-vitality",
      imageUrl: "https://example.com/vitality.png",
      darkModeImageUrl: undefined,
    });
  });
});
