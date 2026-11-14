import assert from "node:assert/strict";
import { z } from "zod";
import type { UpsertTournamentCommand } from "../../src/tournament/application/feed.ts";
import { verifyCountries } from "./countries.mts";
import { byText } from "./support.mts";
import type { Application, Orm, Payload, Request, RequestContextType } from "./support.mts";

const idRef = z.object({ id: z.string() });

const stageView = z.looseObject({
  id: z.string(),
  source: z.string(),
  event: z.looseObject({ slug: z.string(), name: z.string() }),
  league: idRef,
});

const stageBody = z.object({ tournament: stageView });

type StageView = z.infer<typeof stageView>;

type IdRef = z.infer<typeof idRef>;

export interface CompetitionSyncContext {
  app: Application;
  orm: Orm;
  request: Request;
  staffCookie: string;
  RequestContext: RequestContextType;
}

export async function verifyCompetitionSyncLookups({
  app,
  orm,
  request,
  staffCookie,
  RequestContext,
}: CompetitionSyncContext): Promise<void> {
  const { CompetitionSyncService } =
    await import("../../src/tournament/application/sync/competition-sync.service.ts");

  const sync = app.get(CompetitionSyncService);

  function run<T>(work: () => T): T {
    return RequestContext.create(orm.em.fork(), work);
  }

  const league = { pandascoreId: 9701, name: "Lookup League", slug: "lookup-league" };

  const upsert = async (command: Omit<UpsertTournamentCommand, "league">) =>
    await run(async () => await sync.upsertTournament({ league, ...command }));

  const view = async (id: string): Promise<StageView> =>
    (await request("GET", `/tournaments/${id}`)).json(stageBody).tournament;

  const eventSlugOf = async (tournament: IdRef): Promise<string> =>
    (await view(tournament.id)).event.slug;

  const backfilled = await upsert({
    pandascoreId: 9711,
    name: "Lookup Playoffs",
    beginAt: new Date("2026-01-10T12:00:00Z"),
  });

  const backfilledEventSlug = await eventSlugOf(backfilled);

  const claimed = await upsert({
    pandascoreId: 9711,
    name: "Lookup Playoffs",
    beginAt: new Date("2026-01-10T12:00:00Z"),
    serie: { pandascoreId: 9801, fullName: "Spring", year: 2026 },
  });

  assert.equal(claimed.id, backfilled.id);
  assert.equal(
    await eventSlugOf(claimed),
    backfilledEventSlug,
    "a backfilled stage claims its own event for the serie instead of opening a duplicate",
  );
  assert.equal((await view(claimed.id)).event.name, "Lookup League Spring");

  const unclaimed = await upsert({
    pandascoreId: 9712,
    name: "Group A",
    beginAt: new Date("2026-02-10T12:00:00Z"),
  });

  const unclaimedEventSlug = await eventSlugOf(unclaimed);

  const filed = await upsert({
    pandascoreId: 9713,
    name: "Group B",
    beginAt: new Date("2026-02-11T12:00:00Z"),
    serie: { pandascoreId: 9802, fullName: "Group A", year: 2026 },
  });

  assert.equal(
    await eventSlugOf(filed),
    unclaimedEventSlug,
    "a new stage is filed under the unclaimed event of its league with the same name",
  );

  const leagueId = (await view(claimed.id)).league.id;

  const manualEvent = (
    await request(
      "POST",
      "/tournaments",
      { name: "Lookup League Group C", leagueId, beginAt: "2026-04-01T12:00:00Z" },
      staffCookie,
      201,
    )
  ).json(stageBody).tournament;

  assert.equal(manualEvent.event.name, "Lookup League Group C");

  const beside = await upsert({
    pandascoreId: 9714,
    name: "Group D",
    beginAt: new Date("2026-09-01T12:00:00Z"),
    serie: { pandascoreId: 9803, fullName: "Group C", year: 2026 },
  });

  const besideView = await view(beside.id);
  assert.notEqual(
    besideView.event.slug,
    manualEvent.event.slug,
    "a provider stage is never filed under a manual event",
  );
  assert.equal(besideView.event.name, "Lookup League Group C");
  assert.equal((await view(manualEvent.id)).source, "manual");

  const manualFinals = (
    await request(
      "POST",
      "/tournaments",
      {
        name: "Lookup League Counter Finals",
        leagueId,
        beginAt: "2026-03-01T00:00:00Z",
        endAt: "2026-03-02T00:00:00Z",
      },
      staffCookie,
      201,
    )
  ).json(stageBody).tournament;

  const counterpart = await upsert({
    pandascoreId: 9715,
    name: "Finals",
    beginAt: new Date("2026-03-01T12:00:00Z"),
    serie: { pandascoreId: 9804, fullName: "Counter", year: 2026 },
  });

  assert.equal(
    counterpart.id,
    manualFinals.id,
    "the single matching manual tournament becomes the synced stage",
  );
  assert.equal((await view(manualFinals.id)).source, "pandascore");

  const ambiguous = [1, 2].map(() => ({
    name: "Lookup League Twin Finals",
    leagueId,
    beginAt: "2026-05-01T00:00:00Z",
    endAt: "2026-05-02T00:00:00Z",
  }));

  const twins: StageView[] = [];

  for (const body of ambiguous)
    twins.push(
      (await request("POST", "/tournaments", body, staffCookie, 201)).json(stageBody).tournament,
    );

  const separate = await upsert({
    pandascoreId: 9716,
    name: "Finals",
    beginAt: new Date("2026-05-01T12:00:00Z"),
    serie: { pandascoreId: 9805, fullName: "Twin", year: 2026 },
  });

  assert(
    !twins.some((twin) => twin.id === separate.id),
    "several matching manual tournaments are never linked automatically",
  );

  for (const twin of twins) assert.equal((await view(twin.id)).source, "manual");
}

export async function verifyPandascoreAdoption({
  app,
  orm,
  request,
  staffCookie,
  RequestContext,
}: CompetitionSyncContext): Promise<void> {
  const { CompetitionSyncService } =
    await import("../../src/tournament/application/sync/competition-sync.service.ts");

  const { Player } = await import("../../src/roster/infrastructure/persistence/player.entities.ts");
  const { randomUUID } = await import("node:crypto");
  const sync = app.get(CompetitionSyncService);

  function run<T>(work: () => T): T {
    return RequestContext.create(orm.em.fork(), work);
  }

  const importPlayer = async (pandascoreId: number, slug: string): Promise<void> => {
    await run(async () => {
      await sync.applyIncident({
        id: pandascoreId,
        modifiedAt: new Date(),
        changeType: "creation",
        kind: "player",
        command: { player: { pandascoreId, name: slug, slug }, currentTeam: null },
      });
    });
  };

  const imported = async (pandascoreId: number) =>
    await orm.em.fork().findOneOrFail(Player, { pandascoreId });

  const legacy = (
    await request("POST", "/player", { name: "Adoption Legacy" }, staffCookie, 201)
  ).json(z.object({ player: z.looseObject({ id: z.string(), slug: z.string() }) })).player;

  await importPlayer(9951, legacy.slug);
  assert.equal(
    (await imported(9951)).id,
    legacy.id,
    "a legacy row without a provider id is adopted through its slug",
  );

  const startgg = randomUUID();
  const em = orm.em.fork();
  em.persist(
    em.create(Player, {
      id: startgg,
      name: "Adoption Startgg",
      slug: "adoption-startgg",
      source: "startgg",
      status: "active",
    }),
  );
  await em.flush();
  await importPlayer(9952, "adoption-startgg");
  const created = await imported(9952);
  assert.notEqual(created.id, startgg, "a start.gg row is never adopted through its slug");
  assert.equal(created.slug, "adoption-startgg-9952");
  assert.equal(
    (await orm.em.fork().findOneOrFail(Player, { id: startgg })).pandascoreId,
    null,
    "the start.gg row keeps its source and has no provider id",
  );
}

export async function verifyRedistributableScope({
  app,
  orm,
  request,
  staffCookie,
  RequestContext,
}: CompetitionSyncContext): Promise<void> {
  const { MatchService } = await import("../../src/tournament/application/match/match.service.ts");

  const { TournamentPrizeService } =
    await import("../../src/tournament/application/tournament-prize.service.ts");

  const matches = app.get(MatchService);
  const prizes = app.get(TournamentPrizeService);

  function run<T>(work: () => T): T {
    return RequestContext.create(orm.em.fork(), work);
  }

  async function created<T>(path: string, body: Payload, schema: z.ZodType<T>): Promise<T> {
    return (await request("POST", path, body, staffCookie, 201)).json(schema);
  }

  const teamBody = z.object({ team: idRef });
  const alpha = (await created("/team", { name: "Scope Alpha" }, teamBody)).team.id;
  const beta = (await created("/team", { name: "Scope Beta" }, teamBody)).team.id;

  const finishedMatchOf = async (source: string): Promise<string> => {
    const { tournament } = await created(
      "/tournaments",
      {
        name: `Scope ${source} Cup`,
        source,
        teamIds: [alpha, beta],
      },
      z.object({
        tournament: z.looseObject({ id: z.string(), participants: z.array(idRef) }),
      }),
    );

    await created(
      `/tournaments/${tournament.id}/matches`,
      {
        name: `Scope ${source} Final`,
        beginAt: "2026-06-01T10:00:00Z",
        endAt: "2026-06-01T12:00:00Z",
        status: "finished",
        participantIds: tournament.participants.map(({ id }) => id),
      },
      z.looseObject({}),
    );

    const sourceUrl = "https://www.rocketleague.com/en/news/rlcs-official-rules";

    const response = await request(
      "PUT",
      `/tournaments/${tournament.id}/prizes`,
      { prizes: [{ placement: 1, amount: 1000, currency: "USD", teamId: alpha, sourceUrl }] },
      staffCookie,
    );

    assert.equal(
      response.json(z.object({ prizes: z.array(z.looseObject({ sourceUrl: z.string() })) }))
        .prizes[0]?.sourceUrl,
      sourceUrl,
      "a prize keeps the source staff entered",
    );

    return tournament.id;
  };

  const manualCup = await finishedMatchOf("manual");
  const startggCup = await finishedMatchOf("startgg");

  const finishedCups = async (options: { redistributableOnly: boolean }): Promise<string[]> => {
    const [rows, total] = await run(
      async () => await matches.list("results", { teamId: alpha, ...options }),
    );

    assert.equal(total, rows.length, "the total counts the rows that are returned");

    return rows.map((match) => match.tournament.id).sort(byText);
  };

  assert.deepEqual(
    await finishedCups({ redistributableOnly: false }),
    [manualCup, startggCup].sort(),
  );
  assert.deepEqual(
    await finishedCups({ redistributableOnly: true }),
    [manualCup],
    "redistributable lists never carry start.gg matches",
  );

  const earned = async (redistributableOnly: boolean) =>
    (await run(async () => await prizes.teamEarnings(alpha, { redistributableOnly }))).totals;

  assert.deepEqual(await earned(false), [{ currency: "USD", amount: 2000 }]);
  assert.deepEqual(
    await earned(true),
    [{ currency: "USD", amount: 1000 }],
    "redistributable earnings leave out start.gg tournaments",
  );

  await verifyCountries({ request, staffCookie });
}
