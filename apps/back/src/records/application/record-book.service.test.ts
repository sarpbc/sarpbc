import { describe, expect, it } from "vitest";
import type { AlmanacPlayer, AlmanacSeries, AlmanacTeam, EventTitle, RecordSources } from "./ports";
import { RecordBookService } from "./record-book.service";

const team = (id: string, name: string) =>
  ({
    darkModeImageUrl: null,
    id,
    imageUrl: null,
    logoDarkUrl: null,
    logoLightUrl: null,
    name,
    slug: name.toLowerCase(),
  }) satisfies AlmanacTeam;

const player = (id: string, name: string, birthday: string | null = null) =>
  ({ birthday, id, name, slug: name.toLowerCase() }) satisfies AlmanacPlayer;

const falcons = team("t1", "Falcons");
const karmine = team("t2", "Karmine");
const vatira = player("p1", "Vatira", "2005-09-05");
const atow = player("p2", "atow", "2003-01-20");
const zen = player("p3", "zen", "2006-02-23");
const exotiik = player("p4", "Exotiik");

const title = (overrides: Partial<EventTitle>) =>
  ({
    endAt: new Date("2023-08-13T18:00:00Z"),
    format: "3v3",
    nationalTeam: false,
    players: [vatira, atow],
    source: "pandascore",
    stage: {
      event: { name: "RLCS Worlds", slug: "rlcs-worlds" },
      name: "Playoffs",
      slug: "playoffs",
    },
    team: karmine,
    venue: "lan",
    ...overrides,
  }) satisfies EventTitle;

const series = (at: string, order: number, winnerTeamId: string, loserTeamId: string) =>
  ({
    endAt: new Date(at),
    format: "3v3",
    loserTeamId,
    nationalTeams: false,
    order,
    source: "pandascore",
    stageSource: "pandascore",
    venue: "lan",
    winnerTeamId,
  }) satisfies AlmanacSeries;

const sources = (titles: EventTitle[], allSeries: AlmanacSeries[] = []) =>
  ({
    decidedSeries: async () => allSeries,
    eventTitles: async () => titles,
    teams: async (ids) => [falcons, karmine].filter(({ id }) => ids.includes(id)),
  }) satisfies RecordSources;

const venueTitles = () =>
  new RecordBookService(
    sources([
      title({}),
      title({ venue: "online" }),
      title({ venue: null }),
      title({ players: [zen, exotiik], team: falcons }),
    ]),
  );

describe(RecordBookService, () => {
  it("counts event titles for teams and players in every venue", async () => {
    const book = await venueTitles().book(null);

    expect(book.venue).toBeNull();
    expect(book.teamTitles).toMatchObject([
      { rank: 1, team: { name: "Karmine" }, titles: 3 },
      { rank: 2, team: { name: "Falcons" }, titles: 1 },
    ]);
    expect(book.playerTitles).toStrictEqual([
      { player: { name: "atow", slug: "atow" }, rank: 1, titles: 3 },
      { player: { name: "Vatira", slug: "vatira" }, rank: 1, titles: 3 },
      { player: { name: "Exotiik", slug: "exotiik" }, rank: 3, titles: 1 },
      { player: { name: "zen", slug: "zen" }, rank: 3, titles: 1 },
    ]);
  });

  it("counts only the titles of the chosen venue", async () => {
    const service = venueTitles();
    const lan = await service.book("lan");

    expect(lan.venue).toBe("lan");
    expect(lan.teamTitles.map(({ titles }) => titles)).toStrictEqual([1, 1]);

    const online = await service.book("online");

    expect(online.teamTitles).toMatchObject([{ team: { name: "Karmine" }, titles: 1 }]);
    expect(online.playerTitles.map(({ titles }) => titles)).toStrictEqual([1, 1]);
  });

  it("leaves start.gg, other formats and national teams out of every record", async () => {
    const book = await new RecordBookService(
      sources(
        [title({ source: "startgg" }), title({ format: "2v2" }), title({ nationalTeam: true })],
        [
          series("2024-01-01T00:00:00Z", 1, "t1", "t2"),
          { ...series("2024-01-01T12:00:00Z", 2, "t1", "t2"), nationalTeams: true },
          { ...series("2024-01-02T00:00:00Z", 2, "t2", "t1"), stageSource: "startgg" },
          { ...series("2024-01-03T00:00:00Z", 3, "t2", "t1"), format: "1v1" },
        ],
      ),
    ).book(null);

    expect(book).toMatchObject({
      playerTitles: [],
      teamTitles: [],
      winStreaks: [{ from: "2024-01-01", series: 1, team: { name: "Falcons" }, to: "2024-01-01" }],
      youngestChampions: [],
    });
  });

  it("lists each player's youngest title in the venue on the Paris day", async () => {
    const service = new RecordBookService(
      sources([
        title({ endAt: new Date("2022-11-13T23:30:00Z") }),
        title({ endAt: new Date("2023-08-13T18:00:00Z") }),
        title({ endAt: new Date("2021-01-01T18:00:00Z"), venue: "online" }),
        title({ players: [zen, exotiik], team: falcons }),
      ]),
    );

    const everywhere = await service.book(null);

    expect(everywhere.youngestChampions[0]).toMatchObject({
      age: { days: 118, years: 15 },
      date: "2021-01-01",
      player: { name: "Vatira" },
    });

    const book = await service.book("lan");

    expect(book.youngestChampions).toMatchObject([
      {
        age: { days: 70, years: 17 },
        date: "2022-11-14",
        player: { name: "Vatira", slug: "vatira" },
        rank: 1,
        stage: { slug: "playoffs" },
      },
      {
        age: { days: 171, years: 17 },
        date: "2023-08-13",
        player: { name: "zen", slug: "zen" },
        rank: 2,
        stage: { slug: "playoffs" },
      },
      {
        age: { days: 298, years: 19 },
        date: "2022-11-14",
        player: { name: "atow", slug: "atow" },
        rank: 3,
        stage: { slug: "playoffs" },
      },
    ]);
  });

  it("ranks the longest win streaks in the venue with their Paris days", async () => {
    const service = new RecordBookService(
      sources(
        [],
        [
          series("2024-01-01T23:30:00Z", 1, "t2", "t1"),
          series("2024-01-02T12:00:00Z", 2, "t2", "t1"),
          series("2024-01-03T12:00:00Z", 3, "t1", "t2"),
          series("2024-01-04T12:00:00Z", 4, "t2", "unknown"),
          { ...series("2024-01-05T12:00:00Z", 5, "t1", "t2"), venue: "online" },
        ],
      ),
    );

    const book = await service.book("lan");

    expect(book.winStreaks).toMatchObject([
      {
        from: "2024-01-02",
        rank: 1,
        series: 2,
        team: { name: "Karmine" },
        to: "2024-01-02",
      },
      {
        from: "2024-01-03",
        rank: 2,
        series: 1,
        team: { name: "Falcons" },
        to: "2024-01-03",
      },
    ]);

    const online = await service.book("online");

    expect(online.winStreaks).toMatchObject([{ series: 1, team: { name: "Falcons" } }]);
  });
});
