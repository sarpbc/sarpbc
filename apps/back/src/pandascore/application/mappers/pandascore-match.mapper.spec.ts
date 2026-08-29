import { PandascoreMatchMapper } from "./pandascore-match.mapper";

describe("PandascoreMatchMapper", () => {
  it("maps match dto to upsert command", () => {
    const dto = {
      id: 99,
      name: "Grand Final",
      status: "finished",
      slug: "grand-final",
      begin_at: "2025-06-10T15:00:00Z",
      end_at: "2025-06-10T17:00:00Z",
      tournament_id: 42,
      number_of_games: 7,
      opponents: [
        {
          type: "Team",
          opponent: {
            id: 7,
            name: "Team Vitality",
            slug: "team-vitality",
            location: "FR",
            modified_at: "2025-01-01T00:00:00Z",
            acronym: "VIT",
            image_url: "https://example.com/vitality.png",
          },
        },
      ],
      results: [{ team_id: 7, score: 4 }],
      previous_matches: [{ type: "winner", match_id: 88 }],
    } as never;

    const command = PandascoreMatchMapper.toUpsertCommand(dto);

    expect(command).toEqual({
      pandascoreId: 99,
      tournamentPandascoreId: 42,
      name: "Grand Final",
      slug: "grand-final",
      beginAt: new Date("2025-06-10T15:00:00Z"),
      endAt: new Date("2025-06-10T17:00:00Z"),
      status: "finished",
      numberOfGames: 7,
      opponentSlugs: ["team-vitality"],
      results: [{ teamPandascoreId: 7, score: 4 }],
      previousMatches: [{ type: "winner", matchPandascoreId: 88 }],
      officialStreams: [],
    });
  });

  it("maps official streams from streams_list", () => {
    const dto = {
      id: 1,
      tournament_id: 2,
      name: "Semi",
      opponents: [],
      results: [],
      previous_matches: [],
      streams_list: [
        {
          official: true,
          main: true,
          language: "en",
          embed_url: "https://player.twitch.tv/?channel=rlcs",
          raw_url: "https://www.twitch.tv/rocketleague",
        },
      ],
    } as never;

    expect(PandascoreMatchMapper.toUpsertCommand(dto).officialStreams).toEqual([
      { url: "https://www.twitch.tv/rocketleague", language: "en", main: true },
    ]);
  });
});
