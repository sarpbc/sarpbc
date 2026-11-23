import assert from "node:assert/strict";
import { z } from "zod";
import { mapSequentially } from "../../src/common/application/sequentially.ts";
import type { Orm, Payload, Request } from "./support.mts";

export interface RecordsContext {
  orm: Orm;
  request: Request;
  staffCookie: string;
}

const teamRef = z.object({ id: z.string(), name: z.string() });

const stageRef = z.object({
  id: z.string(),
  participants: z.array(z.object({ id: z.string(), team: teamRef })),
  slug: z.string(),
});

type StageRef = z.infer<typeof stageRef>;

const sideOf = (stage: StageRef, teamId: string) => {
  const participant = stage.participants.find(({ team }) => team.id === teamId);
  assert.ok(participant, "the stage has the team");

  return participant.id;
};

const titlesOf = (entries: { titles: number; team: { name: string } }[], name: string) =>
  entries.find((entry) => entry.team.name === name)?.titles;

const playerTitlesOf = (entries: { titles: number; player: { name: string } }[], name: string) =>
  entries.find((entry) => entry.player.name === name)?.titles;

const WINNING_DAYS = [1, 2, 3, 4, 5, 6];

const named = z.object({ name: z.string() });

const recordBook = z.object({
  playerTitles: z.array(z.object({ player: named, titles: z.number() })),
  teamTitles: z.array(z.object({ team: named, titles: z.number() })),
  venue: z.enum(["lan", "online"]).nullable(),
  winStreaks: z.array(
    z.object({ from: z.string(), series: z.number(), team: named, to: z.string() }),
  ),
  youngestChampions: z.array(
    z.object({
      age: z.object({ days: z.number(), years: z.number() }),
      date: z.string(),
      player: named,
      stage: z.object({ slug: z.string() }),
    }),
  ),
});

export const verifyRecords = async ({ orm, request, staffCookie }: RecordsContext) => {
  const created = async <T,>(schema: z.ZodType<T>, path: string, body: Payload) => {
    const response = await request("POST", path, body, staffCookie, 201);

    return response.json(schema);
  };

  const sql = async (query: string, params: (string | number)[]) =>
    await orm.em.fork().getConnection().execute(query, params);

  const { team: kings } = await created(z.object({ team: teamRef }), "/team", {
    name: "Almanac Kings",
  });

  const { team: rivals } = await created(z.object({ team: teamRef }), "/team", {
    name: "Almanac Rivals",
  });

  const { player: prodigy } = await created(z.object({ player: teamRef }), "/player", {
    birthday: "2012-03-10",
    name: "Almanac Prodigy",
  });

  const stage = async (name: string, source = "manual") => {
    const { tournament } = await created(z.object({ tournament: stageRef }), "/tournaments", {
      name,
      source,
      teamIds: [kings.id, rivals.id],
    });

    await sql(
      `insert into "tournament_participant_players" ("tournament_participant_id", "player_id") values (?, ?)`,
      [sideOf(tournament, kings.id), prodigy.id],
    );

    return tournament;
  };

  const crown = async (tournament: StageRef, teamId: string, endAt: string, type = "online") =>
    await sql(`update "tournament" set "winner_id" = ?, "end_at" = ?, "type" = ? where "id" = ?`, [
      sideOf(tournament, teamId),
      endAt,
      type,
      tournament.id,
    ]);

  const major = await stage("Almanac Major");

  await crown(major, kings.id, "2025-03-01T20:00:00Z", "offline");
  const onlineCup = await stage("Almanac Online Cup");

  await crown(onlineCup, kings.id, "2025-04-01T20:00:00Z");
  await crown(await stage("Almanac Community Cup", "startgg"), kings.id, "2025-04-15T20:00:00Z");

  const groups = await stage("Almanac Split Groups");
  const playoffs = await stage("Almanac Split Playoffs");

  await crown(groups, kings.id, "2025-05-01T20:00:00Z", "offline");
  await crown(playoffs, rivals.id, "2025-05-03T20:00:00Z", "offline");
  await sql(
    `update "tournament" set "event_id" = (select "event_id" from "tournament" where "id" = ?) where "id" = ?`,
    [groups.id, playoffs.id],
  );

  const results: [string, number][] = [
    ...WINNING_DAYS.map((day) => [`2025-06-0${day}T12:00:00Z`, 3] satisfies [string, number]),
    ["2025-06-07T12:00:00Z", 1],
    ["2025-06-08T12:00:00Z", 3],
  ];

  const kingsSide = sideOf(major, kings.id);
  const rivalsSide = sideOf(major, rivals.id);

  await mapSequentially(results, async ([endAt, kingsScore], index) => {
    const { match } = await created(
      z.object({ match: z.object({ id: z.string() }) }),
      `/tournaments/${major.id}/matches`,
      { name: `Almanac Series ${index + 1}`, participantIds: [kingsSide, rivalsSide] },
    );

    await request(
      "PATCH",
      `/tournaments/matches/${match.id}`,
      {
        results: [
          { participantId: kingsSide, score: kingsScore },
          { participantId: rivalsSide, score: 2 },
        ],
        status: "finished",
      },
      staffCookie,
    );
    await sql(`update "match" set "end_at" = ? where "id" = ?`, [endAt, match.id]);
  });

  const response = await request("GET", "/records");
  assert.equal(response.headers["cache-control"], "public, max-age=3600");

  const book = recordBook.parse(response.json(z.json()));
  const lanResponse = await request("GET", "/records?venue=lan");
  const lan = recordBook.parse(lanResponse.json(z.json()));
  const onlineResponse = await request("GET", "/records?venue=online");
  const online = recordBook.parse(onlineResponse.json(z.json()));

  await request("GET", "/records?venue=moon", undefined, undefined, 400);

  assert.deepEqual([book.venue, lan.venue, online.venue], [null, "lan", "online"]);

  assert.equal(titlesOf(book.teamTitles, kings.name), 2, "the groups win is not the event title");
  assert.equal(titlesOf(book.teamTitles, rivals.name), 1);
  assert.equal(titlesOf(lan.teamTitles, kings.name), 1);
  assert.equal(titlesOf(lan.teamTitles, rivals.name), 1);
  assert.equal(titlesOf(online.teamTitles, kings.name), 1);
  assert.equal(titlesOf(online.teamTitles, rivals.name), undefined);

  assert.equal(playerTitlesOf(book.playerTitles, prodigy.name), 2);
  assert.equal(playerTitlesOf(lan.playerTitles, prodigy.name), 1);
  assert.equal(playerTitlesOf(online.playerTitles, prodigy.name), 1);

  const youngest = (entries: typeof book.youngestChampions) =>
    entries.find((entry) => entry.player.name === prodigy.name);

  assert.deepEqual(youngest(book.youngestChampions), {
    age: { days: 356, years: 12 },
    date: "2025-03-01",
    player: { name: prodigy.name },
    stage: { slug: major.slug },
  });
  assert.deepEqual(youngest(lan.youngestChampions), youngest(book.youngestChampions));
  assert.deepEqual(youngest(online.youngestChampions), {
    age: { days: 22, years: 13 },
    date: "2025-04-01",
    player: { name: prodigy.name },
    stage: { slug: onlineCup.slug },
  });

  const streak = { from: "2025-06-01", series: 6, team: { name: kings.name }, to: "2025-06-06" };

  const streakOf = (entries: typeof book.winStreaks) =>
    entries.find((entry) => entry.team.name === kings.name);

  assert.deepEqual(streakOf(book.winStreaks), streak);
  assert.deepEqual(streakOf(lan.winStreaks), streak);
  assert.equal(streakOf(online.winStreaks), undefined);

  const patched = await request("PATCH", `/team/${rivals.id}`, { national: true }, staffCookie);

  assert.equal(
    patched.json(z.object({ team: z.object({ national: z.boolean() }) })).team.national,
    true,
  );

  const withNation = await request("GET", "/records");
  const nationBook = recordBook.parse(withNation.json(z.json()));

  assert.equal(titlesOf(nationBook.teamTitles, rivals.name), undefined, "a national team title");
  assert.equal(titlesOf(nationBook.teamTitles, kings.name), 2);
  assert.equal(streakOf(nationBook.winStreaks), undefined, "series against a national team");
};
