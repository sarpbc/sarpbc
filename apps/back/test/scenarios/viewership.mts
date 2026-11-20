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
}

const ENTRY = {
  averageViewers: 32_100,
  measuredAt: "2026-05-24T20:00:00+02:00",
  peakViewers: 54_321,
  scope: "with_costreams",
  sourceName: " Esports Charts ",
  sourceUrl: "https://escharts.com/tournaments/rl/integration-cup",
};

const SAVED = {
  ...ENTRY,
  measuredAt: "2026-05-24T18:00:00.000Z",
  sourceName: "Esports Charts",
};

export const verifyViewership = async ({
  request,
  staffCookie,
  memberCookie,
  tournament,
  match,
}: ViewershipContext) => {
  const matchPath = `/tournaments/matches/${match.id}/viewership`;
  const eventPath = `/events/${tournament.event.id}/viewership`;

  const publicMatch = async () => {
    const response = await request("GET", `/matches/${match.id}`);

    return response.json(creditedMatch).match;
  };

  const publicEvent = async () => {
    const response2 = await request("GET", `/events/resolve/${tournament.event.slug}`);

    return response2.json(creditedEvent).event;
  };

  await request("GET", matchPath, undefined, memberCookie, 403);
  await request("PUT", matchPath, { viewership: ENTRY }, memberCookie, 403);
  const publicMatchResult = await publicMatch();
  assert.equal(publicMatchResult.viewership, null);

  await Promise.all(
    [
      { ...ENTRY, sourceName: "" },
      { ...ENTRY, sourceUrl: "" },
      { ...ENTRY, sourceUrl: "http://escharts.com/tournaments/rl/integration-cup" },
      { ...ENTRY, sourceUrl: "https://liquipedia.net/rocketleague/Integration_Cup" },
      { ...ENTRY, sourceUrl: "https://www.start.gg/tournament/integration-cup" },
      { ...ENTRY, averageViewers: ENTRY.peakViewers + 1 },
    ].map(
      async (missing) => await request("PUT", matchPath, { viewership: missing }, staffCookie, 400),
    ),
  );

  const { sourceName: _, ...uncredited } = ENTRY;
  await request("PUT", matchPath, { viewership: uncredited }, staffCookie, 400);
  const publicMatchResult2 = await publicMatch();
  assert.equal(publicMatchResult2.viewership, null, "a refused entry stores nothing");

  const response3 = await request("PUT", matchPath, { viewership: ENTRY }, staffCookie);
  assert.deepEqual(response3.json(viewershipResponse), { viewership: SAVED });
  const response4 = await request("GET", matchPath, undefined, staffCookie);
  assert.deepEqual(response4.json(viewershipResponse), { viewership: SAVED });
  const publicMatchResult3 = await publicMatch();
  assert.deepEqual(publicMatchResult3.viewership, SAVED, "the site shows the credited numbers");

  await request(
    "PUT",
    eventPath,
    { viewership: { ...ENTRY, averageViewers: null, measuredAt: null, scope: "official" } },
    staffCookie,
  );
  const publicEventResult = await publicEvent();
  assert.deepEqual(publicEventResult.viewership, {
    ...SAVED,
    averageViewers: null,
    measuredAt: null,
    scope: "official",
  });

  const response5 = await request("GET", "/events?limit=100");
  const listed = response5.json(z.object({ events: z.array(z.looseObject({})) })).events;

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
  const publicMatchResult4 = await publicMatch();
  assert.equal(publicMatchResult4.viewership, null);
  const publicEventResult2 = await publicEvent();
  assert.equal(publicEventResult2.viewership, null);
};

export const verifyViewershipProposals = async ({
  request,
  staffCookie,
  callTool,
  review,
  match,
}: ViewershipProposalsContext) => {
  const sourceUrl = "https://escharts.com/tournaments/rl/integration-cup/final";

  const proposal = {
    averageViewers: 25_500,
    peakViewers: 41_000,
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
  const response6 = await request("GET", `/matches/${match.id}`);
  assert.equal(
    response6.json(creditedMatch).match.viewership,
    null,
    "nothing changes before approval",
  );
  const reviewResult = await review(pending);
  assert.equal(reviewResult.status, "applied");
  const expected = { ...proposal, measuredAt: null, sourceUrl };
  const response7 = await request("GET", `/matches/${match.id}`);
  assert.deepEqual(response7.json(creditedMatch).match.viewership, expected);
  const upcoming = await callTool("get_upcoming_matches", {}, mcpMatches);

  const mcpMatch = [...(upcoming.live ?? []), ...(upcoming.upcoming ?? [])].find(
    (candidate) => candidate.id === match.id,
  );

  assert.deepEqual(mcpMatch?.viewership, expected, "MCP reads return sarpbc numbers");

  assert.deepEqual(
    await callTool(
      "set_match_viewership",
      {
        matchId: match.id,
        ...proposal,
        sourceUrl: "https://www.start.gg/tournament/integration-cup",
      },
      toolFailure,
    ),
    { error: true },
    "start.gg is not an accepted source",
  );

  await request(
    "PUT",
    `/tournaments/matches/${match.id}/viewership`,
    { viewership: null },
    staffCookie,
  );
};
