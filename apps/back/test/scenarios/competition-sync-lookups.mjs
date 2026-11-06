import assert from "node:assert/strict";

export async function verifyCompetitionSyncLookups({
  app,
  orm,
  request,
  staffCookie,
  RequestContext,
}) {
  const { CompetitionSyncService } =
    await import("../../src/tournament/application/sync/competition-sync.service.ts");
  const sync = app.get(CompetitionSyncService);
  const run = (work) => RequestContext.create(orm.em.fork(), work);
  const league = { pandascoreId: 9701, name: "Lookup League", slug: "lookup-league" };
  const upsert = (command) => run(() => sync.upsertTournament({ league, ...command }));
  const view = async (id) => (await request("GET", `/tournaments/${id}`)).json().tournament;
  const eventSlugOf = async (tournament) => (await view(tournament.id)).event.slug;

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
  ).json().tournament;
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
  ).json().tournament;
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
  const twins = [];
  for (const body of ambiguous)
    twins.push((await request("POST", "/tournaments", body, staffCookie, 201)).json().tournament);
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

export async function verifyRedistributableScope({
  app,
  orm,
  request,
  staffCookie,
  RequestContext,
}) {
  const { MatchService, TournamentPrizeService } =
    await import("../../src/tournament/application/public.ts");
  const matches = app.get(MatchService);
  const prizes = app.get(TournamentPrizeService);
  const run = (work) => RequestContext.create(orm.em.fork(), work);
  const created = async (path, body) =>
    (await request("POST", path, body, staffCookie, 201)).json();

  const alpha = (await created("/team", { name: "Scope Alpha" })).team.id;
  const beta = (await created("/team", { name: "Scope Beta" })).team.id;
  const finishedMatchOf = async (source) => {
    const { tournament } = await created("/tournaments", {
      name: `Scope ${source} Cup`,
      source,
      teamIds: [alpha, beta],
    });
    await created(`/tournaments/${tournament.id}/matches`, {
      name: `Scope ${source} Final`,
      beginAt: "2026-06-01T10:00:00Z",
      endAt: "2026-06-01T12:00:00Z",
      status: "finished",
      participantIds: tournament.participants.map(({ id }) => id),
    });
    await request(
      "PUT",
      `/tournaments/${tournament.id}/prizes`,
      { prizes: [{ placement: 1, amount: 1000, currency: "USD", teamId: alpha }] },
      staffCookie,
    );
    return tournament.id;
  };
  const manualCup = await finishedMatchOf("manual");
  const startggCup = await finishedMatchOf("startgg");

  const finishedCups = async (options) => {
    const [rows, total] = await run(() => matches.list("results", { teamId: alpha, ...options }));
    assert.equal(total, rows.length, "the total counts the rows that are returned");
    return rows.map((match) => match.tournament.id).sort();
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

  const earned = async (redistributableOnly) =>
    (await run(() => prizes.teamEarnings(alpha, { redistributableOnly }))).totals;
  assert.deepEqual(await earned(false), [{ currency: "USD", amount: 2000 }]);
  assert.deepEqual(
    await earned(true),
    [{ currency: "USD", amount: 1000 }],
    "redistributable earnings leave out start.gg tournaments",
  );
}
