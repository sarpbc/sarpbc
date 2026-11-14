import assert from "node:assert/strict";
import { z } from "zod";
import { toolFailure } from "./support.mts";
import type { CallTool, Request, Review } from "./support.mts";

const stream = z.strictObject({
  url: z.string(),
  platform: z.string(),
  channel: z.string().nullable(),
  language: z.string(),
  kind: z.string(),
  source: z.string(),
});

const streamsResponse = z.object({ streams: z.array(stream), inherited: z.array(stream) });

const watchedMatch = z.object({ match: z.object({ watchStreams: z.array(stream) }) });

const watchedTournament = z.object({
  tournament: z.object({ id: z.string(), watchStreams: z.array(stream) }),
});

const mcpMatches = z.object({
  live: z.array(z.object({ id: z.string(), streams: z.array(z.unknown()) })).optional(),
  upcoming: z.array(z.object({ id: z.string(), streams: z.array(z.unknown()) })).optional(),
});

export interface StreamsContext {
  request: Request;
  staffCookie: string;
  memberCookie: string;
  tournament: { id: string; event: { id: string } };
  match: { id: string };
}

export interface StreamProposalsContext {
  request: Request;
  staffCookie: string;
  callTool: CallTool;
  review: Review;
  tournament: { id: string };
  match: { id: string };
}

const urls = (streams: { url: string }[]): string[] => streams.map((entry) => entry.url);

export async function verifyStreams({
  request,
  staffCookie,
  memberCookie,
  tournament,
  match,
}: StreamsContext): Promise<void> {
  const eventPath = `/events/${tournament.event.id}/streams`;
  const tournamentPath = `/tournaments/${tournament.id}/streams`;
  const matchPath = `/tournaments/matches/${match.id}/streams`;

  const watched = async () => {
    const response = await request("GET", `/matches/${match.id}`);

    return response.json(watchedMatch).match.watchStreams;
  };

  const stage = async () => {
    const response2 = await request("GET", `/tournaments/${tournament.id}`);

    return response2.json(watchedTournament).tournament;
  };

  await request("GET", tournamentPath, undefined, memberCookie, 403);
  await request("PUT", tournamentPath, { streams: [] }, memberCookie, 403);
  assert.deepEqual(await watched(), []);
  const stageResult = await stage();
  assert.deepEqual(stageResult.watchStreams, []);

  const response3 = await request(
    "PUT",
    eventPath,
    {
      streams: [{ url: "https://twitch.tv/integration_event", language: "en", kind: "official" }],
    },
    staffCookie,
  );

  const event = response3.json(z.unknown());

  assert.deepEqual(event, {
    streams: [
      {
        url: "https://twitch.tv/integration_event",
        platform: "twitch",
        channel: "integration_event",
        language: "en",
        kind: "official",
        source: "manual",
      },
    ],
    inherited: [],
  });
  const stageResult2 = await stage();
  assert.deepEqual(urls(stageResult2.watchStreams), ["https://twitch.tv/integration_event"]);
  assert.deepEqual(urls(await watched()), ["https://twitch.tv/integration_event"]);

  const tournamentList = [
    { url: "https://twitch.tv/integration_cup", language: "en", kind: "official" },
    { url: "https://kick.com/integration_fr", language: "FR", kind: "costream" },
  ];

  const response4 = await request("PUT", tournamentPath, { streams: tournamentList }, staffCookie);
  const saved = response4.json(streamsResponse);

  assert.deepEqual(urls(saved.streams), urls(tournamentList));
  assert.deepEqual(urls(saved.inherited), ["https://twitch.tv/integration_event"]);
  assert.deepEqual(
    saved.streams.map((entry) => [entry.platform, entry.language]),
    [
      ["twitch", "en"],
      ["kick", "fr"],
    ],
  );
  const stageResult3 = await stage();
  assert.deepEqual(urls(stageResult3.watchStreams), urls(tournamentList));
  assert.deepEqual(
    urls(await watched()),
    urls(tournamentList),
    "a match without its own list shows the tournament list",
  );
  const response5 = await request("GET", matchPath, undefined, staffCookie);
  assert.deepEqual(response5.json(z.unknown()), {
    streams: [],
    inherited: saved.streams,
  });

  const override = [
    { url: "https://www.youtube.com/@IntegrationB/live", language: "en", kind: "official" },
  ];

  const response6 = await request("PUT", matchPath, { streams: override }, staffCookie);
  const overridden = response6.json(streamsResponse);

  assert.equal(overridden.streams[0].channel, "@IntegrationB");
  assert.deepEqual(
    urls(await watched()),
    urls(override),
    "the match override replaces the tournament list",
  );
  const stageResult4 = await stage();
  assert.deepEqual(urls(stageResult4.watchStreams), urls(tournamentList));

  await request(
    "PUT",
    matchPath,
    { streams: [{ url: "http://twitch.tv/insecure", language: "en", kind: "official" }] },
    staffCookie,
    400,
  );
  await request(
    "PUT",
    matchPath,
    { streams: [{ url: "https://www.youtube.com/watch?v=x", language: "en", kind: "official" }] },
    staffCookie,
    400,
  );
  assert.deepEqual(
    urls(await watched()),
    urls(override),
    "a refused list leaves the override intact",
  );
  await request(
    "PUT",
    "/tournaments/matches/00000000-0000-4000-8000-000000000000/streams",
    { streams: [] },
    staffCookie,
    404,
  );

  await request("PUT", matchPath, { streams: [] }, staffCookie);
  assert.deepEqual(
    urls(await watched()),
    urls(tournamentList),
    "clearing the override restores inheritance",
  );

  const response7 = await request(
    "POST",
    "/tournaments",
    { name: "Integration start.gg Cup", source: "startgg" },
    staffCookie,
    201,
  );

  const startggCup = response7.json(
    z.object({ tournament: z.object({ id: z.string() }) }),
  ).tournament;

  const response8 = await request(
    "PUT",
    `/tournaments/${startggCup.id}/streams`,
    {
      streams: [
        { url: "https://twitch.tv/integration_startgg_cup", language: "en", kind: "official" },
      ],
    },
    staffCookie,
  );

  const startggStreams = response8.json(streamsResponse).streams;

  assert.deepEqual(
    startggStreams.map((entry) => entry.source),
    ["startgg"],
    "staff edits on a start.gg tournament are start.gg data",
  );
  await request("PUT", tournamentPath, { streams: [] }, staffCookie);
  await request("PUT", eventPath, { streams: [] }, staffCookie);
  assert.deepEqual(await watched(), []);
}

export async function verifyStreamProposals({
  request,
  staffCookie,
  callTool,
  review,
  tournament,
  match,
}: StreamProposalsContext): Promise<void> {
  const proposed = {
    url: "https://twitch.tv/integration_startgg",
    language: "en",
    kind: "official",
  };

  const refused = await callTool(
    "set_match_streams",
    { matchId: match.id, streams: [proposed] },
    toolFailure,
  );

  assert.deepEqual(refused, { error: true }, "set_match_streams requires a sourceUrl");

  const startgg = await callTool("set_tournament_streams", {
    tournamentId: tournament.id,
    streams: [proposed],
    sourceUrl: "https://www.start.gg/tournament/integration/event/main",
  });

  assert.equal(startgg.status, "pending");

  const response9 = await request(
    "GET",
    `/tournaments/${tournament.id}/streams`,
    undefined,
    staffCookie,
  );

  assert.deepEqual(response9.json(streamsResponse).streams, [], "nothing changes before approval");
  const reviewResult = await review(startgg);
  assert.equal(reviewResult.status, "applied");

  const response10 = await request("GET", `/tournaments/${tournament.id}`);
  const listed = response10.json(watchedTournament).tournament.watchStreams;

  assert.deepEqual(
    listed.map(({ url, source }) => [url, source]),
    [[proposed.url, "startgg"]],
    "the site keeps start.gg streams with their source for the credit",
  );

  const callToolResult = await callTool(
    "get_tournament",
    { id: tournament.id },
    z.object({ streams: z.array(z.unknown()) }),
  );

  assert.deepEqual(callToolResult.streams, []);
  const upcoming = await callTool("get_upcoming_matches", {}, mcpMatches);

  const mcpMatch = [...(upcoming.live ?? []), ...(upcoming.upcoming ?? [])].find(
    (candidate) => candidate.id === match.id,
  );

  assert.ok(mcpMatch, "the upcoming match is listed through the MCP");
  assert.deepEqual(mcpMatch.streams, [], "MCP match reads drop inherited start.gg streams");

  const manual = await callTool("set_match_streams", {
    matchId: match.id,
    streams: [
      {
        url: "https://twitch.tv/integration_b",
        language: "fr",
        kind: "costream",
        channel: "Integration B",
      },
    ],
    sourceUrl: "https://x.com/integration/status/2",
  });

  const reviewResult2 = await review(manual);
  assert.equal(reviewResult2.status, "applied");

  const response11 = await request("GET", `/matches/${match.id}`);
  const watch = response11.json(watchedMatch).match.watchStreams;

  assert.deepEqual(
    watch.map(({ channel, source }) => [channel, source]),
    [["Integration B", "manual"]],
  );

  await request("PUT", `/tournaments/matches/${match.id}/streams`, { streams: [] }, staffCookie);
  await request("PUT", `/tournaments/${tournament.id}/streams`, { streams: [] }, staffCookie);
}
