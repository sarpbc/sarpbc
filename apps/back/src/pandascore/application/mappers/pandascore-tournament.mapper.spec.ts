import { PandascoreTournamentMapper } from "./pandascore-tournament.mapper";
import { TournamentDto } from "../../infrastructure/dto/tournament.dto";

describe("PandascoreTournamentMapper", () => {
  it("maps tournament dto to upsert command", () => {
    const dto = {
      id: 42,
      name: "RLCS 2025",
      slug: "rlcs-2025",
      type: "online",
      begin_at: "2025-06-01T10:00:00Z",
      end_at: "2025-06-10T18:00:00Z",
      winner_id: 7,
      winner_type: "Team",
      prizepool: 100000,
      tier: "s",
      league: {
        id: 1,
        name: "RLCS",
        slug: "rlcs",
        url: null,
        modified_at: "2025-01-01T00:00:00Z",
        image_url: "https://example.com/league.png",
      },
      serie: {
        id: 2,
        name: "Season",
        year: 2025,
        slug: "season",
        begin_at: "2025-01-01",
        end_at: "2025-12-31",
        winner_id: null,
        winner_type: "Team",
        modified_at: "2025-01-01T00:00:00Z",
        league_id: 1,
        full_name: "RLCS 2025 Season",
      },
      expected_roster: [
        {
          team: {
            id: 7,
            name: "Team Vitality",
            slug: "team-vitality",
            location: "FR",
            modified_at: "2025-01-01T00:00:00Z",
            acronym: "VIT",
            image_url: "https://example.com/vitality.png",
          },
          players: [
            {
              active: true,
              id: 100,
              name: "Zen",
              role: null,
              slug: "zen",
              modified_at: "2025-01-01T00:00:00Z",
              age: 18,
              birthday: "2007-01-01",
              first_name: "Alex",
              last_name: "B",
              nationality: "FR",
              image_url: null,
            },
          ],
        },
      ],
    } as TournamentDto;

    const command = PandascoreTournamentMapper.toUpsertCommand(dto);

    expect(command).toEqual({
      pandascoreId: 42,
      name: "RLCS 2025",
      slug: "rlcs-2025",
      serie: "RLCS 2025 Season",
      tier: "s",
      beginAt: new Date("2025-06-01T10:00:00Z"),
      endAt: new Date("2025-06-10T18:00:00Z"),
      prizepool: "100000",
      type: "online",
      winnerType: "Team",
      winnerPandascoreTeamId: 7,
      hasBracket: undefined,
      league: {
        pandascoreId: 1,
        name: "RLCS",
        slug: "rlcs",
        url: null,
        imageUrl: "https://example.com/league.png",
        modifiedAt: new Date("2025-01-01T00:00:00Z"),
      },
      expectedRoster: [
        {
          team: {
            pandascoreId: 7,
            name: "Team Vitality",
            slug: "team-vitality",
            location: "FR",
            imageUrl: "https://example.com/vitality.png",
            darkModeImageUrl: undefined,
          },
          players: [
            {
              name: "Zen",
              slug: "zen",
              firstName: "Alex",
              lastName: "B",
              birthday: new Date("2007-01-01"),
              nationality: "FR",
              imageUrl: undefined,
              teamSlug: "team-vitality",
              role: null,
            },
          ],
        },
      ],
    });
  });
});
