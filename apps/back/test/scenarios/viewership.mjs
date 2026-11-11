import assert from "node:assert/strict";

const ENTRY = {
  peakViewers: 54_321,
  averageViewers: 32_100,
  scope: "with_costreams",
  measuredAt: "2026-05-24T20:00:00+02:00",
  sourceName: " Esports Charts ",
  sourceUrl: "https://escharts.com/tournaments/rl/integration-cup",
};

const SAVED = {
  ...ENTRY,
  measuredAt: "2026-05-24T18:00:00.000Z",
  sourceName: "Esports Charts",
};

export async function verifyViewership({ request, staffCookie, memberCookie, tournament, match }) {
  const matchPath = `/tournaments/matches/${match.id}/viewership`;
  const eventPath = `/events/${tournament.event.id}/viewership`;
  const publicMatch = async () => (await request("GET", `/matches/${match.id}`)).json().match;
  const publicEvent = async () =>
    (await request("GET", `/events/resolve/${tournament.event.slug}`)).json().event;

  await request("GET", matchPath, undefined, memberCookie, 403);
  await request("PUT", matchPath, { viewership: ENTRY }, memberCookie, 403);
  assert.equal((await publicMatch()).viewership, null);

  for (const missing of [
    { ...ENTRY, sourceName: "" },
    { ...ENTRY, sourceUrl: "" },
    { ...ENTRY, sourceUrl: "http://escharts.com/tournaments/rl/integration-cup" },
    { ...ENTRY, sourceUrl: "https://liquipedia.net/rocketleague/Integration_Cup" },
    { ...ENTRY, averageViewers: ENTRY.peakViewers + 1 },
  ]) {
    await request("PUT", matchPath, { viewership: missing }, staffCookie, 400);
  }
  const { sourceName: _, ...uncredited } = ENTRY;
  await request("PUT", matchPath, { viewership: uncredited }, staffCookie, 400);
  assert.equal((await publicMatch()).viewership, null, "a refused entry stores nothing");

  assert.deepEqual((await request("PUT", matchPath, { viewership: ENTRY }, staffCookie)).json(), {
    viewership: SAVED,
  });
  assert.deepEqual((await request("GET", matchPath, undefined, staffCookie)).json(), {
    viewership: SAVED,
  });
  assert.deepEqual((await publicMatch()).viewership, SAVED, "the site shows the credited numbers");

  await request(
    "PUT",
    eventPath,
    { viewership: { ...ENTRY, averageViewers: null, scope: "official", measuredAt: null } },
    staffCookie,
  );
  assert.deepEqual((await publicEvent()).viewership, {
    ...SAVED,
    averageViewers: null,
    scope: "official",
    measuredAt: null,
  });
  const listed = (await request("GET", "/events?limit=100")).json().events;
  assert.ok(
    listed.every((event) => !("viewership" in event)),
    "event listings do not carry viewership",
  );

  await request(
    "PUT",
    "/tournaments/matches/00000000-0000-4000-8000-000000000000/viewership",
    { viewership: ENTRY },
    staffCookie,
    404,
  );
  await request("PUT", matchPath, { viewership: null }, staffCookie);
  await request("PUT", eventPath, { viewership: null }, staffCookie);
  assert.equal((await publicMatch()).viewership, null);
  assert.equal((await publicEvent()).viewership, null);
}

export async function verifyViewershipProposals({
  request,
  staffCookie,
  callTool,
  review,
  match,
  startggCupId,
  startggMatchId,
}) {
  const sourceUrl = "https://escharts.com/tournaments/rl/integration-cup/final";
  const proposal = {
    peakViewers: 41_000,
    averageViewers: 25_500,
    scope: "official",
    sourceName: "Esports Charts",
  };

  assert.deepEqual(
    await callTool("set_match_viewership", { matchId: match.id, ...proposal }),
    { error: true },
    "set_match_viewership requires a sourceUrl",
  );
  assert.deepEqual(
    await callTool("set_match_viewership", {
      matchId: match.id,
      ...proposal,
      sourceUrl: "https://blast.tv/rl/integration-cup",
    }),
    { error: true },
    "BLAST.tv is not an accepted source",
  );

  const pending = await callTool("set_match_viewership", {
    matchId: match.id,
    ...proposal,
    sourceUrl,
  });
  assert.equal(pending.status, "pending");
  assert.equal(
    (await request("GET", `/matches/${match.id}`)).json().match.viewership,
    null,
    "nothing changes before approval",
  );
  assert.equal((await review(pending)).status, "applied");
  const credited = { ...proposal, measuredAt: null, sourceUrl };
  assert.deepEqual(
    (await request("GET", `/matches/${match.id}`)).json().match.viewership,
    credited,
  );
  const upcoming = await callTool("get_upcoming_matches", {});
  const mcpMatch = [...(upcoming.live ?? []), ...(upcoming.upcoming ?? [])].find(
    (candidate) => candidate.id === match.id,
  );
  assert.deepEqual(mcpMatch?.viewership, credited, "MCP reads return sarpbc numbers");

  const startggEntry = { ...credited, peakViewers: 9_000, averageViewers: 6_000 };
  await request(
    "PUT",
    `/tournaments/matches/${startggMatchId}/viewership`,
    { viewership: startggEntry },
    staffCookie,
  );
  const site = (await request("GET", `/matches/${startggMatchId}`)).json().match;
  assert.deepEqual(site.viewership, startggEntry, "the site shows start.gg match numbers");
  assert.equal(site.tournament.source, "startgg", "the site can credit start.gg");
  assert.deepEqual(
    await callTool("set_match_viewership", { matchId: startggMatchId, ...proposal, sourceUrl }),
    { error: true },
    "start.gg matches are refused",
  );
  const results = await callTool("get_match_results", {});
  const reads = [...(upcoming.live ?? []), ...(upcoming.upcoming ?? []), ...results.results];
  assert.ok(
    reads.every((candidate) => candidate.id !== startggMatchId),
    "MCP reads leave start.gg matches and their numbers out",
  );

  const startggEvent = (await request("GET", `/tournaments/${startggCupId}`)).json().tournament
    .event;
  await request(
    "PUT",
    `/events/${startggEvent.id}/viewership`,
    { viewership: startggEntry },
    staffCookie,
  );
  assert.deepEqual(
    (await request("GET", `/events/resolve/${startggEvent.slug}`)).json().event.viewership,
    startggEntry,
  );
  assert.deepEqual(await callTool("get_event", { idOrSlug: startggEvent.id }), { error: true });
  assert.deepEqual(
    await callTool("set_event_viewership", { eventId: startggEvent.id, ...proposal, sourceUrl }),
    { error: true },
    "start.gg events are refused",
  );

  await request(
    "PUT",
    `/tournaments/matches/${match.id}/viewership`,
    { viewership: null },
    staffCookie,
  );
}
