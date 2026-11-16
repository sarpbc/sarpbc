import assert from "node:assert/strict";
import { z } from "zod";
import { mapSequentially } from "../../src/common/application/sequentially.ts";
import { byJoined } from "./support.mts";
import type { Orm, Payload, Request } from "./support.mts";

const DAY = "2026-02-17";

const participantOf = (stage: StageRef, teamId: string): string => {
  const participant = stage.participants.find(({ team }) => team.id === teamId);
  assert.ok(participant, "the stage has the team");

  return participant.id;
};

export interface OnThisDayContext {
  orm: Orm;
  request: Request;
  staffCookie: string;
  memberCookie: string;
}

const teamRef = z.object({ id: z.string(), name: z.string(), slug: z.string() });

const stageRef = z.object({
  id: z.string(),
  participants: z.array(z.object({ id: z.string(), team: teamRef })),
});

type StageRef = z.infer<typeof stageRef>;

const matchRef = z.object({ id: z.string() });

type MatchRef = z.infer<typeof matchRef>;

const teamBody = z.object({ team: teamRef });
const stageBody = z.object({ tournament: stageRef });
const matchBody = z.object({ match: matchRef });
const playerBody = z.object({ player: matchRef });

const savedFact = z.object({ fact: z.object({ id: z.string(), link: z.unknown() }) });

const side = z.object({ team: z.object({ name: z.string() }).nullable() });

const onThisDay = z.object({
  date: z.string(),
  events: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("fact"),
        link: z.object({ slug: z.string() }).nullable(),
        text: z.object({ en: z.string() }),
        year: z.number().nullable(),
      }),
      z.object({
        date: z.string(),
        kind: z.literal("title"),
        winner: side,
        year: z.number(),
      }),
      z.object({
        kind: z.literal("final"),
        loser: side,
        winner: side.extend({ score: z.number().nullable() }),
        year: z.number(),
      }),
      z.object({
        age: z.number(),
        kind: z.literal("birthday"),
        player: z.object({ name: z.string() }),
        year: z.number(),
      }),
      z.object({
        kind: z.literal("transfer"),
        team: z.object({ name: z.string() }),
        type: z.string(),
        year: z.number(),
      }),
    ]),
  ),
});

export const verifyOnThisDay = async ({
  orm,
  request,
  staffCookie,
  memberCookie,
}: OnThisDayContext): Promise<void> => {
  const created = async <T,>(schema: z.ZodType<T>, path: string, body: Payload): Promise<T> => {
    const response = await request("POST", path, body, staffCookie, 201);

    return response.json(schema);
  };

  const sql = async (query: string, params: (string | number)[]) =>
    await orm.em.fork().getConnection().execute(query, params);

  const response2 = await created(teamBody, "/team", { name: "Anniversary Home" });
  const home = response2.team;
  const response3 = await created(teamBody, "/team", { name: "Anniversary Away" });
  const away = response3.team;

  const stage = async (name: string, source = "manual"): Promise<StageRef> => {
    const response4 = await created(stageBody, "/tournaments", {
      name,
      source,
      teamIds: [home.id, away.id],
    });

    return response4.tournament;
  };

  const crown = async (tournament: StageRef, endAt: string) =>
    await sql("update tournament set winner_id = ?, end_at = ? where id = ?", [
      participantOf(tournament, home.id),
      endAt,
      tournament.id,
    ]);

  const bracket = await stage("Anniversary Bracket");
  const homeSide = participantOf(bracket, home.id);
  const awaySide = participantOf(bracket, away.id);

  await request("PATCH", `/tournaments/${bracket.id}`, { hasBracket: true }, staffCookie);

  const response5 = await created(matchBody, `/tournaments/${bracket.id}/matches`, {
    name: "Semifinal",
    participantIds: [homeSide, awaySide],
  });

  const semifinal = response5.match;

  const response6 = await created(matchBody, `/tournaments/${bracket.id}/matches`, {
    name: "Grand Final",
    participantIds: [homeSide, awaySide],
    previousMatches: [{ previousMatchId: semifinal.id, type: "winner" }],
  });

  const final = response6.match;

  const finals: [MatchRef, number][] = [
    [semifinal, 3],
    [final, 4],
  ];

  await mapSequentially(
    finals,
    async ([match, homeScore]) =>
      await request(
        "PUT",
        `/tournaments/matches/${match.id}/result`,
        {
          results: [
            { participantId: homeSide, score: homeScore },
            { participantId: awaySide, score: 2 },
          ],
        },
        staffCookie,
      ),
  );
  await sql("update match set end_at = ? where id = ?", ["2024-02-17T20:00:00Z", semifinal.id]);
  await sql("update match set end_at = ? where id = ?", ["2024-02-17T21:00:00Z", final.id]);
  await crown(bracket, "2024-02-17T21:30:00Z");

  await crown(await stage("Anniversary Late Night Cup"), "2022-02-16T23:30:00Z");
  await crown(await stage("Anniversary Next Day Cup"), "2021-02-17T23:30:00Z");
  await crown(await stage("Anniversary This Year Cup"), "2026-02-17T12:00:00Z");
  await crown(await stage("Anniversary Community Cup", "startgg"), "2023-02-17T20:00:00Z");

  const { player } = await created(playerBody, "/player", { name: "Anniversary Rookie" });

  await created(playerBody, "/player", { birthday: "2001-02-17", name: "Anniversary Veteran" });

  await created(z.unknown(), `/player/${player.id}/contract`, {
    endDate: "2024-02-17",
    startDate: "2023-02-17",
    teamId: away.id,
  });
  await created(z.unknown(), `/player/${player.id}/contract`, {
    endDate: "2025-01-10",
    startDate: "2024-02-17",
    teamId: home.id,
  });

  const fact = {
    day: 17,
    link: { id: home.id, kind: "team" },
    month: 2,
    sourceUrl: "https://www.rocketleague.com/news",
    textEn: "A staff-written anniversary.",
    textFr: "Un anniversaire écrit par le staff.",
    year: 2017,
  };

  await request("POST", "/on-this-day-facts", fact, memberCookie, 403);
  await request(
    "POST",
    "/on-this-day-facts",
    { ...fact, sourceUrl: "https://liquipedia.net/rocketleague/Main_Page" },
    staffCookie,
    400,
  );
  const response7 = await created(savedFact, "/on-this-day-facts", fact);
  const saved = response7.fact;
  assert.deepEqual(saved.link, {
    id: home.id,
    kind: "team",
    name: home.name,
    slug: home.slug,
    source: null,
  });

  const response8 = await created(savedFact, "/on-this-day-facts", {
    ...fact,
    link: null,
    year: 2030,
  });

  const future = response8.fact;

  const response9 = await request("GET", `/on-this-day?date=${DAY}`);
  const body = response9.json(z.json());
  const { date, events } = onThisDay.parse(body);
  assert.equal(date, DAY);

  const summary = events.map((event) => {
    switch (event.kind) {
      case "fact": {
        assert.ok(event.link, "the staff fact links a team");

        return [event.kind, event.year, event.text.en, event.link.slug];
      }

      case "title": {
        return [event.kind, event.year, event.date, event.winner.team?.name];
      }

      case "final": {
        return [event.kind, event.year, event.winner.score, event.loser.team?.name];
      }

      case "birthday": {
        return [event.kind, event.year, event.age, event.player.name];
      }

      case "transfer": {
        return [event.kind, event.year, event.type, event.team.name];
      }

      default: {
        const unhandled: never = event;

        return [unhandled];
      }
    }
  });

  assert.deepEqual(
    summary.slice(0, 3),
    [
      ["fact", 2017, fact.textEn, home.slug],
      ["final", 2024, 4, away.name],
      ["title", 2022, "2022-02-17", home.name],
    ],
    "titles and finals use the Paris day; start.gg, next-day and current-year titles stay out",
  );
  assert.deepEqual(
    summary.filter(([kind]) => kind === "birthday"),
    [["birthday", 2001, 25, "Anniversary Veteran"]],
    "players born on this day appear with the age they reach",
  );
  assert.deepEqual(
    summary.filter(([kind]) => kind === "transfer").toSorted(byJoined),
    [
      ["transfer", 2023, "arrival", away.name],
      ["transfer", 2024, "arrival", home.name],
      ["transfer", 2024, "departure", away.name],
    ],
    "transfers are derived from the contracts that start or end on this day",
  );
  assert.ok(!JSON.stringify(body).includes(home.id), "the public payload carries no internal id");

  await request("DELETE", `/on-this-day-facts/${saved.id}`, undefined, staffCookie, 204);
  await request("DELETE", `/on-this-day-facts/${future.id}`, undefined, staffCookie, 204);
};
