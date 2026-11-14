import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const DAY = 86_400_000;
const RULES = "https://example.test/fake-circuit/rules";

function pandascoreStage({ pandascoreId, serieId, name, teams, endAt }) {
  return {
    pandascoreId,
    name,
    serie: { pandascoreId: serieId, fullName: `Fake Circuit ${name}`, year: 2026 },
    beginAt: new Date(endAt.getTime() - 3 * DAY),
    endAt,
    expectedRoster: teams.map((team) => ({ team, players: [] })),
  };
}

export async function verifyCircuits({
  app,
  orm,
  RequestContext,
  request,
  staffCookie,
  memberCookie,
  callTool,
  review,
  tournament,
}) {
  const { CompetitionSyncService } =
    await import("../../src/tournament/application/sync/competition-sync.service.ts");

  const sync = app.get(CompetitionSyncService);
  const run = (work) => RequestContext.create(orm.em.fork(), work);

  const teams = [9801, 9802, 9803].map((pandascoreId) => ({
    pandascoreId,
    name: `Circuit Team ${pandascoreId}`,
    slug: `circuit-team-${pandascoreId}`,
  }));

  const finished = new Date(Date.now() - DAY);

  const counted = await run(() =>
    sync.upsertTournament({
      ...pandascoreStage({
        pandascoreId: 9701,
        serieId: 9711,
        name: "Finals",
        teams,
        endAt: finished,
      }),
      standings: [
        { teamPandascoreId: 9801, rank: 1 },
        { teamPandascoreId: 9802, rank: 2 },
        { teamPandascoreId: 9803, rank: 2 },
      ],
    }),
  );

  const pending = await run(() =>
    sync.upsertTournament(
      pandascoreStage({
        pandascoreId: 9702,
        serieId: 9712,
        name: "Qualifier",
        teams,
        endAt: finished,
      }),
    ),
  );

  const startgg = (
    await request(
      "POST",
      "/tournaments",
      { name: "Fake Circuit start.gg Open", source: "startgg" },
      staffCookie,
      201,
    )
  ).json().tournament;

  const identity = { season: 2026, sourceUrl: RULES };
  await request("POST", "/circuits", { name: "Fake Circuit", ...identity }, memberCookie, 403);

  for (const missing of [{ season: 2026 }, { sourceUrl: RULES }])
    await request("POST", "/circuits", { name: "Fake Circuit", ...missing }, staffCookie, 400);
  await request(
    "POST",
    "/circuits",
    { name: "Fake Circuit", season: 2026, sourceUrl: "https://liquipedia.net/rocketleague/Fake" },
    staffCookie,
    400,
  );

  const circuit = (
    await request(
      "POST",
      "/circuits",
      { name: "Fake Circuit", qualificationSpots: 2, ...identity },
      staffCookie,
      201,
    )
  ).json();

  assert.equal(circuit.slug, "fake-circuit");
  await request("POST", "/circuits", { name: "Fake circuit", ...identity }, staffCookie, 409);

  for (const cleared of [{ season: null }, { sourceUrl: null }])
    await request("PATCH", `/circuits/${circuit.id}`, cleared, staffCookie, 400);

  const { CircuitPersistence } =
    await import("../../src/circuit/infrastructure/persistence/circuit.store.ts");

  const { ConflictError } = await import("../../src/common/domain/errors.ts");

  const saveDirectly = (fields) =>
    new CircuitPersistence(orm.em.fork()).save({
      id: randomUUID(),
      season: null,
      region: null,
      description: null,
      sourceUrl: null,
      qualificationSpots: null,
      ...fields,
    });

  for (const [first, twin, why] of [
    [{ season: null, region: null }, { season: null, region: null }, "no season and no region"],
    [{ season: 2026, region: null }, { season: 2026, region: null }, "no region"],
    [{ season: null, region: "EU" }, { season: null, region: "eu" }, "no season"],
    [{ season: 2026, region: "EU" }, { season: 2026, region: "eu" }, "a season and a region"],
  ]) {
    const slug = `fake-db-twin-${randomUUID()}`;
    await saveDirectly({ ...first, name: "Fake DB Twin", slug });
    await assert.rejects(
      saveDirectly({ ...twin, name: "fake db twin", slug: `${slug}-copy` }),
      ConflictError,
      `the database refuses a twin circuit with ${why}`,
    );
    await orm.em.fork().nativeDelete("Circuit", { slug });
  }

  const raced = await Promise.all(
    ["Fake Raced", "fake raced"].map((name, index) =>
      app.inject({
        method: "POST",
        url: "/circuits",
        payload: { name, slug: `fake-raced-${index}`, season: 2026, sourceUrl: RULES },
        remoteAddress: "127.0.0.1",
        headers: { cookie: staffCookie },
      }),
    ),
  );

  assert.deepEqual(
    raced.map(({ statusCode }) => statusCode).sort(),
    [201, 409],
    "concurrent twin creates leave one circuit",
  );

  for (const response of raced.filter(({ statusCode }) => statusCode === 201))
    await request("DELETE", `/circuits/${response.json().id}`, undefined, staffCookie, 204);
  assert(
    (await request("GET", "/circuits")).json().circuits.some(({ id }) => id === circuit.id),
    "the public list shows the circuit",
  );

  const scale = [
    { from: 2, to: 3, points: 6 },
    { from: 1, to: 1, points: 10 },
  ];

  const stagePath = (id) => `/circuits/${circuit.id}/stages/${id}`;
  await request("PUT", stagePath(counted.id), { scale }, staffCookie, 400);
  await request(
    "PUT",
    stagePath(counted.id),
    {
      scale: [
        { from: 1, to: 2, points: 5 },
        { from: 2, to: 2, points: 1 },
      ],
      sourceUrl: RULES,
    },
    staffCookie,
    400,
  );
  await request(
    "PUT",
    stagePath(counted.id),
    { scale, sourceUrl: "https://blast.tv/rl/leaderboard/2026/world-championship/eu" },
    staffCookie,
    400,
  );
  await request("PUT", stagePath(counted.id), { scale, sourceUrl: RULES }, memberCookie, 403);

  const standings = async () =>
    (await request("GET", `/circuits/${circuit.slug}/standings`)).json();

  assert.deepEqual((await standings()).rows, [], "nothing counts before a scale is entered");

  assert.deepEqual(
    await callTool("set_circuit_stage_scale", {
      circuitId: circuit.id,
      tournamentId: counted.id,
      scale,
    }),
    { error: true },
    "set_circuit_stage_scale requires a sourceUrl",
  );
  assert.deepEqual(
    await callTool("set_circuit_stage_scale", {
      circuitId: circuit.id,
      tournamentId: counted.id,
      scale,
      sourceUrl: "https://www.blast.tv/rl/leaderboard/2026",
    }),
    { error: true },
    "a BLAST.tv source is refused through the MCP",
  );

  const proposal = await callTool("set_circuit_stage_scale", {
    circuitId: circuit.id,
    tournamentId: counted.id,
    scale,
    sourceUrl: RULES,
  });

  assert.equal(proposal.status, "pending");
  assert.deepEqual((await standings()).rows, [], "nothing changes before approval");
  assert.equal((await review(proposal)).status, "applied");

  const detail = (
    await request(
      "PUT",
      stagePath(pending.id),
      { scale: [{ from: 1, to: 1, points: 3 }], sourceUrl: RULES },
      staffCookie,
    )
  ).json();

  assert.deepEqual(
    Object.fromEntries(detail.stages.map((stage) => [stage.tournament.id, stage.scale])),
    { [counted.id]: [...scale].reverse(), [pending.id]: [{ from: 1, to: 1, points: 3 }] },
    "the admin detail lists both stages with their scales sorted by placement",
  );

  const result = await standings();
  assert.equal(result.qualificationSpots, 2);
  assert.deepEqual(result.sourceUrls, [RULES]);
  assert.deepEqual(
    result.rows.map(({ rank, points, team, events }) => [
      rank,
      points,
      team.slug,
      events.map((cell) => [cell.eventId, cell.placement]),
    ]),
    [
      [1, 10, "circuit-team-9801", [[counted.event.id, 1]]],
      [2, 6, "circuit-team-9802", [[counted.event.id, 2]]],
      [2, 6, "circuit-team-9803", [[counted.event.id, 2]]],
    ],
    "tied PandaScore placements share the tier and the rank",
  );
  assert.deepEqual(
    Object.fromEntries(result.events.map(({ event, status }) => [event.id, status])),
    { [counted.event.id]: "counted", [pending.event.id]: "awaiting_results" },
  );

  const mcp = await callTool("get_circuit", { idOrSlug: circuit.slug });
  assert.deepEqual(
    mcp.standings.map(({ points }) => points),
    [10, 6, 6],
  );
  assert(mcp.stages.every((stage) => stage.tournament.source === "pandascore"));
  assert((await callTool("list_circuits", {})).some(({ id }) => id === circuit.id));

  const eventTeams = (
    await request("GET", `${stagePath(counted.id)}/teams`, undefined, staffCookie)
  ).json().teams;

  assert.deepEqual(
    eventTeams.map(({ team, placement }) => [team.slug, placement]),
    [
      ["circuit-team-9801", 1],
      ["circuit-team-9802", 2],
      ["circuit-team-9803", 2],
    ],
  );
  await request("GET", `${stagePath(counted.id)}/teams`, undefined, memberCookie, 403);
  const teamId = (slug) => eventTeams.find(({ team }) => team.slug === slug).team.id;

  for (const attached of [tournament, startgg])
    await request("PUT", stagePath(attached.id), { scale, sourceUrl: RULES }, staffCookie);
  const withAll = (await request("GET", `/circuits/${circuit.id}`, undefined, staffCookie)).json();
  assert.deepEqual(
    withAll.stages.map(({ tournament: { source } }) => source).sort(),
    ["manual", "pandascore", "pandascore", "startgg"],
    "staff see manual and start.gg stages",
  );
  const publicEvents = (await standings()).events.map(({ event }) => event.id);
  assert(publicEvents.includes(tournament.event.id), "a manual stage is public");
  assert(!publicEvents.includes(startgg.event.id), "a start.gg stage stays out of the standings");
  const mcpAll = await callTool("get_circuit", { idOrSlug: circuit.slug });
  assert(!JSON.stringify(mcpAll).includes(startgg.id), "get_circuit leaves start.gg out");

  for (const attached of [tournament, startgg])
    await request("DELETE", stagePath(attached.id), undefined, staffCookie, 204);

  await request(
    "PUT",
    stagePath(counted.id),
    { scale, sourceUrl: RULES, regionTeamIds: [randomUUID()] },
    staffCookie,
    400,
  );
  await request("PATCH", `/circuits/${circuit.id}`, { region: "EU" }, staffCookie);

  const regional = (
    await request(
      "PUT",
      stagePath(counted.id),
      {
        scale: [...scale, { from: 9, to: 12, points: 2 }],
        sourceUrl: RULES,
        worldwide: true,
        regionTeamIds: [teamId("circuit-team-9801"), teamId("circuit-team-9803")],
        finishes: [{ teamId: teamId("circuit-team-9803"), placement: 9 }],
      },
      staffCookie,
    )
  ).json();

  assert.deepEqual(
    regional.stages
      .filter(({ tournament: { id } }) => id === counted.id)
      .map(({ worldwide, regionTeams, finishes }) => [
        worldwide,
        regionTeams.map(({ slug }) => slug),
        finishes.map(({ team, placement }) => [team.slug, placement]),
      ]),
    [[true, ["circuit-team-9801", "circuit-team-9803"], [["circuit-team-9803", 9]]]],
  );
  assert.deepEqual(
    (await standings()).rows.map(({ points, team }) => [team.slug, points]),
    [
      ["circuit-team-9801", 10],
      ["circuit-team-9803", 2],
    ],
    "a worldwide stage of a regional circuit credits only the region teams, with staff-entered places",
  );
  await request("PATCH", `/circuits/${circuit.id}`, { region: null }, staffCookie);
  await request("PUT", stagePath(counted.id), { scale, sourceUrl: RULES }, staffCookie);

  const created = await callTool("create_circuit", {
    name: "Fake Series 2026",
    slug: "fake-season-2026",
    season: 2026,
    region: "Worldwide",
    description: "A fake circuit created through the MCP.",
    sourceUrl: RULES,
  });

  assert.equal(created.slug, "fake-season-2026");
  assert.equal(created.sourceUrl, RULES);

  for (const [refused, why] of [
    [{ slug: "fake-season-2026", name: "Another Fake", season: 2026 }, "a taken slug"],
    [{ slug: "fake-twin", name: "fake series 2026", region: "worldwide" }, "a name twin"],
    [{ slug: "fake-lp", sourceUrl: "https://liquipedia.net/rocketleague/Fake" }, "Liquipedia"],
  ])
    assert.deepEqual(
      await callTool("create_circuit", {
        name: "Fake Series 2026",
        season: 2026,
        region: "Worldwide",
        sourceUrl: RULES,
        ...refused,
      }),
      { error: true },
      `create_circuit refuses ${why}`,
    );

  const updated = await callTool("update_circuit", {
    idOrSlug: "fake-season-2026",
    region: "EU",
    qualificationSpots: 1,
  });

  assert.equal(updated.region, "EU");
  assert.equal(updated.qualificationSpots, 1);

  const mcpProposal = await callTool("set_circuit_stage_scale", {
    circuitId: created.id,
    tournamentId: counted.id,
    scale,
    sourceUrl: RULES,
  });

  assert.equal((await review(mcpProposal)).status, "applied");
  const createdDetail = await callTool("get_circuit", { idOrSlug: "fake-season-2026" });
  assert.equal(createdDetail.season, 2026);
  assert.deepEqual(
    createdDetail.stages.map((stage) => stage.tournament.id),
    [counted.id],
  );
  assert.deepEqual(
    createdDetail.standings.map(({ points }) => points),
    [10, 6, 6],
  );
  assert((await callTool("list_circuits", {})).some(({ id }) => id === created.id));
  await request("DELETE", `/circuits/${created.id}`, undefined, staffCookie, 204);

  await request("DELETE", stagePath(pending.id), undefined, staffCookie, 204);
  await request("DELETE", stagePath(pending.id), undefined, staffCookie, 404);
  await request("DELETE", `/circuits/${circuit.id}`, undefined, staffCookie, 204);
  await request("GET", `/circuits/${circuit.slug}/standings`, undefined, undefined, 404);
}
