import { describe, expect, it } from "vitest";
import { matchSchema } from "../dto/match.dto";
import { toUpsertMatchCommand } from "./pandascore-match.mapper";

describe("PandascoreMatchMapper", () => {
  it("maps match dto to upsert command", () => {
    const dto = matchSchema.parse({
      begin_at: "2025-06-10T15:00:00Z",
      end_at: "2025-06-10T17:00:00Z",
      id: 99,
      name: "Grand Final",
      number_of_games: 7,
      opponents: [
        {
          opponent: {
            acronym: "VIT",
            id: 7,
            image_url: "https://example.com/vitality.png",
            location: "FR",
            modified_at: "2025-01-01T00:00:00Z",
            name: "Team Vitality",
            slug: "team-vitality",
          },
          type: "Team",
        },
      ],
      previous_matches: [{ match_id: 88, type: "winner" }],
      results: [{ score: 4, team_id: 7 }],
      status: "finished",
      tournament_id: 42,
    });

    const command = toUpsertMatchCommand(dto);

    expect(command).toStrictEqual({
      beginAt: new Date("2025-06-10T15:00:00Z"),
      endAt: new Date("2025-06-10T17:00:00Z"),
      name: "Grand Final",
      numberOfGames: 7,
      officialStreams: [],
      opponentPandascoreIds: [7],
      opponentSlugs: ["team-vitality"],
      pandascoreId: 99,
      previousMatches: [{ matchPandascoreId: 88, type: "winner" }],
      results: [{ score: 4, teamPandascoreId: 7 }],
      status: "finished",
      tournamentPandascoreId: 42,
    });
  });

  it("maps official streams from streams_list", () => {
    const dto = matchSchema.parse({
      id: 1,
      name: "Semi",
      opponents: [],
      previous_matches: [],
      results: [],
      streams_list: [
        {
          embed_url: "https://player.twitch.tv/?channel=rlcs",
          language: "en",
          main: true,
          official: true,
          raw_url: "https://www.twitch.tv/rocketleague",
        },
      ],
      tournament_id: 2,
    });

    expect(toUpsertMatchCommand(dto).officialStreams).toStrictEqual([
      { language: "en", main: true, url: "https://www.twitch.tv/rocketleague" },
    ]);
  });
});
