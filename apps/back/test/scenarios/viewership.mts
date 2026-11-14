import assert from "node:assert/strict";
import { z } from "zod";
import { toolFailure } from "./support.mts";
import type { CallTool, Request, Review } from "./support.mts";

const credited = z.object({ viewership: z.unknown() });

const creditedMatch = z.object({ match: credited });

const creditedEvent = z.object({ event: credited });

const viewershipResponse = z.unknown();

const mcpMatches = z.object({
  live: z.array(z.object({ id: z.string(), viewership: z.unknown() })).optional(),
  upcoming: z.array(z.object({ id: z.string(), viewership: z.unknown() })).optional(),
});

const eventRef = z.object({ id: z.string(), slug: z.string() });

type EventRef = z.infer<typeof eventRef>;

export interface ViewershipContext {
  request: Request;
  staffCookie: string;
  memberCookie: string;
  tournament: { event: EventRef };
  match: { id: string };
}

export interface ViewershipProposalsContext {
  request: Request;
  staffCookie: string;
  callTool: CallTool;
  review: Review;
  match: { id: string };
  startggCupId: string;
  startggMatchId: string;
}

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

export async function verifyViewership({
  request,
  staffCookie,
  memberCookie,
  tournament,
  match,
}: ViewershipContext): Promise<void> {
  const matchPath = `/tournaments/matches/${match.id}/viewership`;
  const eventPath = `/events/${tournament.event.id}/viewership`;

  const publicMatch = async () =>
    (await request("GET", `/matches/${match.id}`)).json(creditedMatch).match;

  const publicEvent = async () =>
    (await request("GET", `/events/resolve/${tournament.event.slug}`)).json(creditedEvent).event;

  await request("GET", matchPath, undefined, memberCookie, 403);
  await request("PUT", matchPath, { viewership: ENTRY }, memberCookie, 403);
  assert.equal((await publicMatch()).viewership, null);

  for (const missing of [
    { ...ENTRY, sourceName: "" },
    { ...ENTRY, sourceUrl: "" },
    { ...ENTRY, sourceUrl: "http://escharts.com/tournaments/rl/integration-cup" },
    { ...ENTRY, sourceUrl: "https://liquipedia.net/rocketleague/Integration_Cup" },
    { ...ENTRY, sourceUrl: "https://www.start.gg/tournament/integration-cup" },
    { ...ENTRY, averageViewers: ENTRY.peakViewers + 1 },
  ]) {
    await request("PUT", matchPath, { viewership: missing }, staffCookie, 400);
  }

  const { sourceName: _, ...uncredited } = ENTRY;
  await request("PUT", matchPath, { viewership: uncredited }, staffCookie, 400);
  assert.equal((await publicMatch()).viewership, null, "a refused entry stores nothing");

  assert.deepEqual(
    (await request("PUT", matchPath, { viewership: ENTRY }, staffCookie)).json(viewershipResponse),
    { viewership: SAVED },
  );
  assert.deepEqual(
    (await request("GET", matchPath, undefined, staffCookie)).json(viewershipResponse),
    { viewership: SAVED },
  );
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

  const listed = (await request("GET", "/events?limit=100")).json(
    z.object({ events: z.array(z.looseObject({})) }),
  ).events;

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
}: ViewershipProposalsContext): Promise<void> {
  const sourceUrl = "https://escharts.com/tournaments/rl/integration-cup/final";

  const proposal = {
    peakViewers: 41_000,
    averageViewers: 25_500,
    scope: "official",
    sourceName: "Esports Charts",
  };

  assert.deepEqual(
    await callTool("set_match_viewership", { matchId: match.id, ...proposal }, toolFailure),
    { error: true },
    "set_match_viewership requires a sourceUrl",
  );
  assert.deepEqual(
    await callTool(
      "set_match_viewership",
      {
        matchId: match.id,
        ...proposal,
        sourceUrl: "https://blast.tv/rl/integration-cup",
      },
      toolFailure,
    ),
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
    (await request("GET", `/matches/${match.id}`)).json(creditedMatch).match.viewership,
    null,
    "nothing changes before approval",
  );
  assert.equal((await review(pending)).status, "applied");
  const expected = { ...proposal, measuredAt: null, sourceUrl };
  assert.deepEqual(
    (await request("GET", `/matches/${match.id}`)).json(creditedMatch).match.viewership,
    expected,
  );
  const upcoming = await callTool("get_upcoming_matches", {}, mcpMatches);

  const mcpMatch = [...(upcoming.live ?? []), ...(upcoming.upcoming ?? [])].find(
    (candidate) => candidate.id === match.id,
  );

  assert.deepEqual(mcpMatch?.viewership, expected, "MCP reads return sarpbc numbers");

  const startggEntry = { ...expected, peakViewers: 9000, averageViewers: 6000 };
  await request(
    "PUT",
    `/tournaments/matches/${startggMatchId}/viewership`,
    { viewership: startggEntry },
    staffCookie,
  );

  const site = (await request("GET", `/matches/${startggMatchId}`)).json(
    z.object({ match: credited.extend({ tournament: z.object({ source: z.string() }) }) }),
  ).match;

  assert.deepEqual(site.viewership, startggEntry, "the site shows start.gg match numbers");
  assert.equal(site.tournament.source, "startgg", "the site can credit start.gg");
  assert.deepEqual(
    await callTool(
      "set_match_viewership",
      { matchId: startggMatchId, ...proposal, sourceUrl },
      toolFailure,
    ),
    { error: true },
    "start.gg matches are refused",
  );

  const results = await callTool(
    "get_match_results",
    {},
    z.object({ results: z.array(z.object({ id: z.string() })) }),
  );

  const reads = [...(upcoming.live ?? []), ...(upcoming.upcoming ?? []), ...results.results];
  assert.ok(
    reads.every((candidate) => candidate.id !== startggMatchId),
    "MCP reads leave start.gg matches and their numbers out",
  );

  const startggEvent = (await request("GET", `/tournaments/${startggCupId}`)).json(
    z.object({ tournament: z.object({ event: eventRef }) }),
  ).tournament.event;

  await request(
    "PUT",
    `/events/${startggEvent.id}/viewership`,
    { viewership: startggEntry },
    staffCookie,
  );
  assert.deepEqual(
    (await request("GET", `/events/resolve/${startggEvent.slug}`)).json(creditedEvent).event
      .viewership,
    startggEntry,
  );
  assert.deepEqual(await callTool("get_event", { idOrSlug: startggEvent.id }, toolFailure), {
    error: true,
  });
  assert.deepEqual(
    await callTool(
      "set_event_viewership",
      { eventId: startggEvent.id, ...proposal, sourceUrl },
      toolFailure,
    ),
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
