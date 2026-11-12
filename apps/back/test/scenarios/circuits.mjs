import assert from "node:assert/strict";

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

  await request("POST", "/circuits", { name: "Fake Circuit" }, memberCookie, 403);
  const circuit = (
    await request(
      "POST",
      "/circuits",
      { name: "Fake Circuit", qualificationSpots: 2 },
      staffCookie,
      201,
    )
  ).json();
  assert.equal(circuit.slug, "fake-circuit");
  await request("POST", "/circuits", { name: "Fake circuit" }, staffCookie, 409);
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
  for (const refused of [startgg, tournament])
    await request("PUT", stagePath(refused.id), { scale, sourceUrl: RULES }, staffCookie, 400);
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
      tournamentId: startgg.id,
      scale,
      sourceUrl: RULES,
    }),
    { error: true },
    "a start.gg stage is refused through the MCP",
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

  await request("DELETE", stagePath(pending.id), undefined, staffCookie, 204);
  await request("DELETE", stagePath(pending.id), undefined, staffCookie, 404);
  await request("DELETE", `/circuits/${circuit.id}`, undefined, staffCookie, 204);
  await request("GET", `/circuits/${circuit.slug}/standings`, undefined, undefined, 404);
}
