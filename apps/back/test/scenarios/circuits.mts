import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { CircuitScaleTier } from "@sarpbc/types";
import { z } from "zod";
import { mapSequentially } from "../../src/common/application/sequentially.ts";
import { toolFailure } from "./support.mts";
import type {
  Application,
  CallTool,
  Orm,
  Request,
  RequestContextType,
  Review,
} from "./support.mts";

const idRef = z.looseObject({ id: z.string() });

const circuitSummary = z.looseObject({
  description: z.string().nullable(),
  id: z.string(),
  name: z.string(),
  qualificationSpots: z.number().nullable(),
  region: z.string().nullable(),
  season: z.number().nullable(),
  slug: z.string(),
  sourceUrl: z.string().nullable(),
});

type CircuitSummary = z.infer<typeof circuitSummary>;

const standingTeam = z.looseObject({ id: z.string(), slug: z.string() });

const scaleTier = z.looseObject({ from: z.number(), points: z.number(), to: z.number() });

const circuitDetail = circuitSummary.extend({
  stages: z.array(
    z.looseObject({
      finishes: z.array(z.looseObject({ placement: z.number(), team: standingTeam })),
      regionTeams: z.array(standingTeam),
      scale: z.array(scaleTier),
      tournament: z.looseObject({ id: z.string(), source: z.string() }),
      worldwide: z.boolean(),
    }),
  ),
});

const circuitStandings = circuitSummary.extend({
  events: z.array(z.looseObject({ event: idRef, status: z.string() })),
  rows: z.array(
    z.looseObject({
      events: z.array(z.looseObject({ eventId: z.string(), placement: z.number() })),
      points: z.number(),
      rank: z.number(),
      team: standingTeam,
    }),
  ),
  sourceUrls: z.array(z.string()),
});

const mcpCircuit = circuitSummary.extend({
  stages: z.array(
    z.looseObject({ tournament: z.looseObject({ id: z.string(), source: z.string() }) }),
  ),
  standings: z.array(z.looseObject({ points: z.number() })),
});

const eventTeams = z.object({
  teams: z.array(z.looseObject({ placement: z.number().nullable(), team: standingTeam })),
});

const stageRef = z.looseObject({ event: idRef, id: z.string() });

interface StageInput {
  pandascoreId: number;
  serieId: number;
  name: string;
  teams: { pandascoreId: number; name: string; slug: string }[];
  endAt: Date;
}

type Placement = Pick<CircuitSummary, "season" | "region">;

interface CircuitFields extends Partial<Placement> {
  name: string;
  slug: string;
}

type StageRef = z.infer<typeof stageRef>;

export interface CircuitsContext {
  app: Application;
  orm: Orm;
  RequestContext: RequestContextType;
  request: Request;
  staffCookie: string;
  memberCookie: string;
  callTool: CallTool;
  review: Review;
  tournament: StageRef;
}

const DAY = 86_400_000;
const RULES = "https://example.test/fake-circuit/rules";

const pandascoreStage = ({ pandascoreId, serieId, name, teams, endAt }: StageInput) => ({
  beginAt: new Date(endAt.getTime() - 3 * DAY),
  endAt,
  expectedRoster: teams.map((team) => ({ players: [], team })),
  name,
  pandascoreId,
  serie: { fullName: `Fake Circuit ${name}`, pandascoreId: serieId, year: 2026 },
});

export const verifyCircuits = async ({
  app,
  orm,
  RequestContext,
  request,
  staffCookie,
  memberCookie,
  callTool,
  review,
  tournament,
}: CircuitsContext) => {
  const { CompetitionSyncService } =
    await import("../../src/tournament/application/sync/competition-sync.service.ts");

  const sync = app.get(CompetitionSyncService);

  const run = <T,>(work: () => T) => RequestContext.create(orm.em.fork(), work);

  const teams = [9801, 9802, 9803].map((pandascoreId) => ({
    name: `Circuit Team ${pandascoreId}`,
    pandascoreId,
    slug: `circuit-team-${pandascoreId}`,
  }));

  const finished = new Date(Date.now() - DAY);

  const counted = await run(
    async () =>
      await sync.upsertTournament({
        ...pandascoreStage({
          endAt: finished,
          name: "Finals",
          pandascoreId: 9701,
          serieId: 9711,
          teams,
        }),
        standings: [
          { rank: 1, teamPandascoreId: 9801 },
          { rank: 2, teamPandascoreId: 9802 },
          { rank: 2, teamPandascoreId: 9803 },
        ],
      }),
  );

  const pending = await run(
    async () =>
      await sync.upsertTournament(
        pandascoreStage({
          endAt: finished,
          name: "Qualifier",
          pandascoreId: 9702,
          serieId: 9712,
          teams,
        }),
      ),
  );

  const response2 = await request(
    "POST",
    "/tournaments",
    { name: "Fake Circuit start.gg Open", source: "startgg" },
    staffCookie,
    201,
  );

  const startgg = response2.json(z.object({ tournament: stageRef })).tournament;

  const identity = { season: 2026, sourceUrl: RULES };
  await request("POST", "/circuits", { name: "Fake Circuit", ...identity }, memberCookie, 403);

  await Promise.all(
    [{ season: 2026 }, { sourceUrl: RULES }].map(
      async (missing) =>
        await request("POST", "/circuits", { name: "Fake Circuit", ...missing }, staffCookie, 400),
    ),
  );

  await request(
    "POST",
    "/circuits",
    { name: "Fake Circuit", season: 2026, sourceUrl: "https://liquipedia.net/rocketleague/Fake" },
    staffCookie,
    400,
  );

  const response3 = await request(
    "POST",
    "/circuits",
    { name: "Fake Circuit", qualificationSpots: 2, ...identity },
    staffCookie,
    201,
  );

  const circuit = response3.json(circuitSummary);

  assert.equal(circuit.slug, "fake-circuit");
  await request("POST", "/circuits", { name: "Fake circuit", ...identity }, staffCookie, 409);

  await Promise.all(
    [{ season: null }, { sourceUrl: null }].map(
      async (cleared) =>
        await request("PATCH", `/circuits/${circuit.id}`, cleared, staffCookie, 400),
    ),
  );

  const { CircuitPersistence } =
    await import("../../src/circuit/infrastructure/persistence/circuit.store.ts");

  const { Circuit } =
    await import("../../src/circuit/infrastructure/persistence/circuit.entity.ts");

  const { ConflictError } = await import("../../src/common/domain/errors/conflict-error.ts");

  const saveDirectly = async (fields: CircuitFields) => {
    await new CircuitPersistence(orm.em.fork()).save({
      description: null,
      id: randomUUID(),
      qualificationSpots: null,
      region: null,
      season: null,
      sourceUrl: null,
      ...fields,
    });
  };

  const twins: [Placement, Placement, string][] = [
    [{ region: null, season: null }, { region: null, season: null }, "no season and no region"],
    [{ region: null, season: 2026 }, { region: null, season: 2026 }, "no region"],
    [{ region: "EU", season: null }, { region: "eu", season: null }, "no season"],
    [{ region: "EU", season: 2026 }, { region: "eu", season: 2026 }, "a season and a region"],
  ];

  await mapSequentially(twins, async ([first, twin, why]) => {
    const slug = `fake-db-twin-${randomUUID()}`;
    await saveDirectly({ ...first, name: "Fake DB Twin", slug });
    await assert.rejects(
      saveDirectly({ ...twin, name: "fake db twin", slug: `${slug}-copy` }),
      ConflictError,
      `the database refuses a twin circuit with ${why}`,
    );
    await orm.em.fork().nativeDelete(Circuit, { slug });
  });

  const raced = await Promise.all(
    ["Fake Raced", "fake raced"].map(
      async (name, index) =>
        await app.inject({
          headers: { cookie: staffCookie },
          method: "POST",
          payload: { name, season: 2026, slug: `fake-raced-${index}`, sourceUrl: RULES },
          remoteAddress: "127.0.0.1",
          url: "/circuits",
        }),
    ),
  );

  assert.deepEqual(
    raced.map(({ statusCode }) => statusCode).toSorted((a, b) => a - b),
    [201, 409],
    "concurrent twin creates leave one circuit",
  );

  await Promise.all(
    raced
      .filter(({ statusCode }) => statusCode === 201)
      .map(
        async (response) =>
          await request(
            "DELETE",
            `/circuits/${idRef.parse(response.json()).id}`,
            undefined,
            staffCookie,
            204,
          ),
      ),
  );
  const response4 = await request("GET", "/circuits");
  assert.ok(
    response4
      .json(z.object({ circuits: z.array(idRef) }))
      .circuits.some(({ id }) => id === circuit.id),
    "the public list shows the circuit",
  );

  const scale: CircuitScaleTier[] = [
    { from: 2, points: 6, to: 3 },
    { from: 1, points: 10, to: 1 },
  ];

  const stagePath = (id: string) => `/circuits/${circuit.id}/stages/${id}`;
  await request("PUT", stagePath(counted.id), { scale }, staffCookie, 400);
  await request(
    "PUT",
    stagePath(counted.id),
    {
      scale: [
        { from: 1, points: 5, to: 2 },
        { from: 2, points: 1, to: 2 },
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

  const standings = async () => {
    const response5 = await request("GET", `/circuits/${circuit.slug}/standings`);

    return response5.json(circuitStandings);
  };

  const standingsResult = await standings();
  assert.deepEqual(standingsResult.rows, [], "nothing counts before a scale is entered");

  assert.deepEqual(
    await callTool(
      "set_circuit_stage_scale",
      {
        circuitId: circuit.id,
        scale,
        tournamentId: counted.id,
      },
      toolFailure,
    ),
    { error: true },
    "set_circuit_stage_scale requires a sourceUrl",
  );
  assert.deepEqual(
    await callTool(
      "set_circuit_stage_scale",
      {
        circuitId: circuit.id,
        scale,
        sourceUrl: "https://www.blast.tv/rl/leaderboard/2026",
        tournamentId: counted.id,
      },
      toolFailure,
    ),
    { error: true },
    "a BLAST.tv source is refused through the MCP",
  );

  const proposal = await callTool("set_circuit_stage_scale", {
    circuitId: circuit.id,
    scale,
    sourceUrl: RULES,
    tournamentId: counted.id,
  });

  assert.equal(proposal.status, "pending");
  const standingsResult2 = await standings();
  assert.deepEqual(standingsResult2.rows, [], "nothing changes before approval");
  const reviewResult = await review(proposal);
  assert.equal(reviewResult.status, "applied");

  const response6 = await request(
    "PUT",
    stagePath(pending.id),
    { scale: [{ from: 1, points: 3, to: 1 }], sourceUrl: RULES },
    staffCookie,
  );

  const detail = response6.json(circuitDetail);

  assert.deepEqual(
    Object.fromEntries(detail.stages.map((stage) => [stage.tournament.id, stage.scale])),
    { [counted.id]: scale.toReversed(), [pending.id]: [{ from: 1, points: 3, to: 1 }] },
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

  const mcp = await callTool("get_circuit", { idOrSlug: circuit.slug }, mcpCircuit);
  assert.deepEqual(
    mcp.standings.map(({ points }) => points),
    [10, 6, 6],
  );
  assert.ok(mcp.stages.every((stage) => stage.tournament.source === "pandascore"));
  const callToolResult = await callTool("list_circuits", {}, z.array(idRef));
  assert.ok(callToolResult.some(({ id }) => id === circuit.id));

  const response7 = await request("GET", `${stagePath(counted.id)}/teams`, undefined, staffCookie);
  const teamsOfEvent = response7.json(eventTeams).teams;

  assert.deepEqual(
    teamsOfEvent.map(({ team, placement }) => [team.slug, placement]),
    [
      ["circuit-team-9801", 1],
      ["circuit-team-9802", 2],
      ["circuit-team-9803", 2],
    ],
  );
  await request("GET", `${stagePath(counted.id)}/teams`, undefined, memberCookie, 403);

  const teamId = (slug: string) => {
    const found = teamsOfEvent.find(({ team }) => team.slug === slug);
    assert.ok(found, `${slug} is listed among the event teams`);

    return found.team.id;
  };

  await Promise.all(
    [tournament, startgg].map(
      async (attached) =>
        await request("PUT", stagePath(attached.id), { scale, sourceUrl: RULES }, staffCookie),
    ),
  );

  const response8 = await request("GET", `/circuits/${circuit.id}`, undefined, staffCookie);
  const withAll = response8.json(circuitDetail);

  assert.deepEqual(
    withAll.stages.map(({ tournament: { source } }) => source).toSorted(),
    ["manual", "pandascore", "pandascore", "startgg"],
    "staff see manual and start.gg stages",
  );
  const standingsResult3 = await standings();
  const publicEvents = new Set(standingsResult3.events.map(({ event }) => event.id));
  assert.ok(publicEvents.has(tournament.event.id), "a manual stage is public");
  assert.ok(!publicEvents.has(startgg.event.id), "a start.gg stage stays out of the standings");
  const mcpAll = await callTool("get_circuit", { idOrSlug: circuit.slug }, mcpCircuit);
  assert.ok(!JSON.stringify(mcpAll).includes(startgg.id), "get_circuit leaves start.gg out");

  await Promise.all(
    [tournament, startgg].map(
      async (attached) =>
        await request("DELETE", stagePath(attached.id), undefined, staffCookie, 204),
    ),
  );

  await request(
    "PUT",
    stagePath(counted.id),
    { regionTeamIds: [randomUUID()], scale, sourceUrl: RULES },
    staffCookie,
    400,
  );
  await request("PATCH", `/circuits/${circuit.id}`, { region: "EU" }, staffCookie);

  const response9 = await request(
    "PUT",
    stagePath(counted.id),
    {
      finishes: [{ placement: 9, teamId: teamId("circuit-team-9803") }],
      regionTeamIds: [teamId("circuit-team-9801"), teamId("circuit-team-9803")],
      scale: [...scale, { from: 9, points: 2, to: 12 }],
      sourceUrl: RULES,
      worldwide: true,
    },
    staffCookie,
  );

  const regional = response9.json(circuitDetail);

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
  const standingsResult4 = await standings();
  assert.deepEqual(
    standingsResult4.rows.map(({ points, team }) => [team.slug, points]),
    [
      ["circuit-team-9801", 10],
      ["circuit-team-9803", 2],
    ],
    "a worldwide stage of a regional circuit credits only the region teams, with staff-entered places",
  );
  await request("PATCH", `/circuits/${circuit.id}`, { region: null }, staffCookie);
  await request("PUT", stagePath(counted.id), { scale, sourceUrl: RULES }, staffCookie);

  const created = await callTool(
    "create_circuit",
    {
      description: "A fake circuit created through the MCP.",
      name: "Fake Series 2026",
      region: "Worldwide",
      season: 2026,
      slug: "fake-season-2026",
      sourceUrl: RULES,
    },
    circuitSummary,
  );

  assert.equal(created.slug, "fake-season-2026");
  assert.equal(created.sourceUrl, RULES);

  const refusals: [Partial<CircuitSummary>, string][] = [
    [{ name: "Another Fake", season: 2026, slug: "fake-season-2026" }, "a taken slug"],
    [{ name: "fake series 2026", region: "worldwide", slug: "fake-twin" }, "a name twin"],
    [{ slug: "fake-lp", sourceUrl: "https://liquipedia.net/rocketleague/Fake" }, "Liquipedia"],
  ];

  const refusedResults = await Promise.all(
    refusals.map(
      async ([refused]) =>
        await callTool(
          "create_circuit",
          {
            name: "Fake Series 2026",
            region: "Worldwide",
            season: 2026,
            sourceUrl: RULES,
            ...refused,
          },
          toolFailure,
        ),
    ),
  );

  for (const [index, [, why]] of refusals.entries()) {
    assert.deepEqual(refusedResults[index], { error: true }, `create_circuit refuses ${why}`);
  }

  const updated = await callTool(
    "update_circuit",
    {
      idOrSlug: "fake-season-2026",
      qualificationSpots: 1,
      region: "EU",
    },
    circuitSummary,
  );

  assert.equal(updated.region, "EU");
  assert.equal(updated.qualificationSpots, 1);

  const mcpProposal = await callTool("set_circuit_stage_scale", {
    circuitId: created.id,
    scale,
    sourceUrl: RULES,
    tournamentId: counted.id,
  });

  const reviewResult2 = await review(mcpProposal);
  assert.equal(reviewResult2.status, "applied");
  const createdDetail = await callTool("get_circuit", { idOrSlug: "fake-season-2026" }, mcpCircuit);
  assert.equal(createdDetail.season, 2026);
  assert.deepEqual(
    createdDetail.stages.map((stage) => stage.tournament.id),
    [counted.id],
  );
  assert.deepEqual(
    createdDetail.standings.map(({ points }) => points),
    [10, 6, 6],
  );
  const callToolResult2 = await callTool("list_circuits", {}, z.array(idRef));
  assert.ok(callToolResult2.some(({ id }) => id === created.id));
  await request("DELETE", `/circuits/${created.id}`, undefined, staffCookie, 204);

  await request("DELETE", stagePath(pending.id), undefined, staffCookie, 204);
  await request("DELETE", stagePath(pending.id), undefined, staffCookie, 404);
  await request("DELETE", `/circuits/${circuit.id}`, undefined, staffCookie, 204);
  await request("GET", `/circuits/${circuit.slug}/standings`, undefined, undefined, 404);
};
