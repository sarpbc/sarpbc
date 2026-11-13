import assert from "node:assert/strict";

const DAY = "2026-02-17";

export async function verifyOnThisDay({ orm, request, staffCookie, memberCookie }) {
  const created = async (path, body) =>
    (await request("POST", path, body, staffCookie, 201)).json();
  const sql = (query, params) => orm.em.fork().getConnection().execute(query, params);

  const home = (await created("/team", { name: "Anniversary Home" })).team;
  const away = (await created("/team", { name: "Anniversary Away" })).team;
  const stage = async (name, source = "manual") =>
    (await created("/tournaments", { name, source, teamIds: [home.id, away.id] })).tournament;
  const crown = (tournament, endAt) =>
    sql("update tournament set winner_id = ?, end_at = ? where id = ?", [
      tournament.participants.find(({ team }) => team.id === home.id).id,
      endAt,
      tournament.id,
    ]);

  const bracket = await stage("Anniversary Bracket");
  const [homeSide, awaySide] = [home, away].map(
    (team) => bracket.participants.find((participant) => participant.team.id === team.id).id,
  );
  await request("PATCH", `/tournaments/${bracket.id}`, { hasBracket: true }, staffCookie);
  const semifinal = (
    await created(`/tournaments/${bracket.id}/matches`, {
      name: "Semifinal",
      participantIds: [homeSide, awaySide],
    })
  ).match;
  const final = (
    await created(`/tournaments/${bracket.id}/matches`, {
      name: "Grand Final",
      participantIds: [homeSide, awaySide],
      previousMatches: [{ previousMatchId: semifinal.id, type: "winner" }],
    })
  ).match;
  for (const [match, homeScore] of [
    [semifinal, 3],
    [final, 4],
  ])
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
    );
  await sql("update match set end_at = ? where id = ?", ["2024-02-17T20:00:00Z", semifinal.id]);
  await sql("update match set end_at = ? where id = ?", ["2024-02-17T21:00:00Z", final.id]);
  await crown(bracket, "2024-02-17T21:30:00Z");

  await crown(await stage("Anniversary Late Night Cup"), "2022-02-16T23:30:00Z");
  await crown(await stage("Anniversary Next Day Cup"), "2021-02-17T23:30:00Z");
  await crown(await stage("Anniversary This Year Cup"), "2026-02-17T12:00:00Z");
  await crown(await stage("Anniversary Community Cup", "startgg"), "2023-02-17T20:00:00Z");

  const player = (await created("/player", { name: "Anniversary Rookie" })).player;
  await created(`/player/${player.id}/contract`, {
    teamId: away.id,
    startDate: "2023-02-17",
    endDate: "2024-02-17",
  });
  await created(`/player/${player.id}/contract`, {
    teamId: home.id,
    startDate: "2024-02-17",
    endDate: "2025-01-10",
  });

  const fact = {
    month: 2,
    day: 17,
    year: 2017,
    textEn: "A staff-written anniversary.",
    textFr: "Un anniversaire écrit par le staff.",
    link: { kind: "team", id: home.id },
    sourceUrl: "https://www.rocketleague.com/news",
  };
  await request("POST", "/on-this-day-facts", fact, memberCookie, 403);
  await request(
    "POST",
    "/on-this-day-facts",
    { ...fact, sourceUrl: "https://liquipedia.net/rocketleague/Main_Page" },
    staffCookie,
    400,
  );
  const saved = (await created("/on-this-day-facts", fact)).fact;
  assert.deepEqual(saved.link, {
    kind: "team",
    id: home.id,
    name: home.name,
    slug: home.slug,
    source: null,
  });
  const future = (await created("/on-this-day-facts", { ...fact, year: 2030, link: null })).fact;

  const { date, events } = (await request("GET", `/on-this-day?date=${DAY}`)).json();
  assert.equal(date, DAY);
  const summary = events.map((event) => {
    switch (event.kind) {
      case "fact":
        return [event.kind, event.year, event.text.en, event.link.slug];
      case "title":
        return [event.kind, event.year, event.date, event.winner.team.name];
      case "final":
        return [event.kind, event.year, event.winner.score, event.loser.team.name];
      case "transfer":
        return [event.kind, event.year, event.type, event.team.name];
      default:
        return [event.kind];
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
    summary.slice(3).sort(),
    [
      ["transfer", 2023, "arrival", away.name],
      ["transfer", 2024, "arrival", home.name],
      ["transfer", 2024, "departure", away.name],
    ],
    "transfers are derived from the contracts that start or end on this day",
  );
  assert(!JSON.stringify(events).includes(home.id), "the public payload carries no internal id");

  await request("DELETE", `/on-this-day-facts/${saved.id}`, undefined, staffCookie, 204);
  await request("DELETE", `/on-this-day-facts/${future.id}`, undefined, staffCookie, 204);
}
