import { describe, expect, it } from "vitest";
import { toUpsertTournamentCommand } from "./pandascore-tournament.mapper";
import { tournamentSchema } from "../dto/tournament.dto";

describe("PandascoreTournamentMapper", () => {
  it("maps tournament dto to upsert command", () => {
    const dto = tournamentSchema.parse({
      begin_at: "2025-06-01T10:00:00Z",
      country: "DE",
      end_at: "2025-06-10T18:00:00Z",
      expected_roster: [
        {
          players: [
            {
              active: true,
              age: 18,
              birthday: "2007-01-01",
              first_name: "Alex",
              id: 100,
              image_url: null,
              last_name: "B",
              modified_at: "2025-01-01T00:00:00Z",
              name: "Zen",
              nationality: "FR",
              role: null,
              slug: "zen",
            },
          ],
          team: {
            acronym: "VIT",
            id: 7,
            image_url: "https://example.com/vitality.png",
            location: "FR",
            modified_at: "2025-01-01T00:00:00Z",
            name: "Team Vitality",
            slug: "team-vitality",
          },
        },
      ],
      id: 42,
      league: {
        id: 1,
        image_url: "https://example.com/league.png",
        modified_at: "2025-01-01T00:00:00Z",
        name: "RLCS",
        slug: "rlcs",
        url: null,
      },
      name: "RLCS 2025",
      prizepool: 100_000,
      serie: {
        begin_at: "2025-01-01",
        end_at: "2025-12-31",
        full_name: "RLCS 2025 Season",
        id: 2,
        league_id: 1,
        modified_at: "2025-01-01T00:00:00Z",
        name: "Season",
        slug: "season",
        winner_id: null,
        winner_type: "Team",
        year: 2025,
      },
      slug: "rlcs-2025",
      tier: "s",
      type: "offline",
      winner_id: 7,
      winner_type: "Team",
    });

    const command = toUpsertTournamentCommand(dto);

    expect(command).toStrictEqual({
      beginAt: new Date("2025-06-01T10:00:00Z"),
      country: "DE",
      endAt: new Date("2025-06-10T18:00:00Z"),
      expectedRoster: [
        {
          players: [
            {
              birthday: new Date("2007-01-01"),
              firstName: "Alex",
              imageUrl: undefined,
              lastName: "B",
              name: "Zen",
              nationality: "FR",
              pandascoreId: 100,
              role: null,
              slug: "zen",
            },
          ],
          team: {
            darkModeImageUrl: undefined,
            imageUrl: "https://example.com/vitality.png",
            location: "FR",
            name: "Team Vitality",
            pandascoreId: 7,
            slug: "team-vitality",
          },
        },
      ],
      hasBracket: undefined,
      league: {
        imageUrl: "https://example.com/league.png",
        modifiedAt: new Date("2025-01-01T00:00:00Z"),
        name: "RLCS",
        pandascoreId: 1,
        slug: "rlcs",
        url: null,
      },
      name: "RLCS 2025",
      pandascoreId: 42,
      prizepool: "100000",
      serie: { fullName: "RLCS 2025 Season", pandascoreId: 2, year: 2025 },
      tier: "s",
      type: "offline",
      winnerPandascoreTeamId: 7,
      winnerType: "Team",
    });
  });
});
