import assert from "node:assert/strict";
import { z } from "zod";
import { toolFailure } from "./support.mts";
import type { CallTool, Request, Review } from "./support.mts";

const stream = z.strictObject({
  channel: z.string().nullable(),
  kind: z.string(),
  language: z.string(),
  platform: z.string(),
  source: z.string(),
  url: z.string(),
});

const streamsResponse = z.object({ inherited: z.array(stream), streams: z.array(stream) });

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

const urls = (streams: { url: string }[]) => streams.map((entry) => entry.url);

export const verifyStreams = async ({
  request,
  staffCookie,
  memberCookie,
  tournament,
  match,
}: StreamsContext) => {
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
      streams: [{ kind: "official", language: "en", url: "https://twitch.tv/integration_event" }],
    },
    staffCookie,
  );

  const event = response3.json(z.unknown());

  assert.deepEqual(event, {
    inherited: [],
    streams: [
      {
        channel: "integration_event",
        kind: "official",
        language: "en",
        platform: "twitch",
        source: "manual",
        url: "https://twitch.tv/integration_event",
      },
    ],
  });
  const stageResult2 = await stage();
  assert.deepEqual(urls(stageResult2.watchStreams), ["https://twitch.tv/integration_event"]);
  assert.deepEqual(urls(await watched()), ["https://twitch.tv/integration_event"]);

  const tournamentList = [
    { kind: "official", language: "en", url: "https://twitch.tv/integration_cup" },
    { kind: "costream", language: "FR", url: "https://kick.com/integration_fr" },
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
    inherited: saved.streams,
    streams: [],
  });

  const override = [
    { kind: "official", language: "en", url: "https://www.youtube.com/@IntegrationB/live" },
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
    { streams: [{ kind: "official", language: "en", url: "http://twitch.tv/insecure" }] },
    staffCookie,
    400,
  );
  await request(
    "PUT",
    matchPath,
    { streams: [{ kind: "official", language: "en", url: "https://www.youtube.com/watch?v=x" }] },
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

  await request("PUT", tournamentPath, { streams: [] }, staffCookie);
  await request("PUT", eventPath, { streams: [] }, staffCookie);
  assert.deepEqual(await watched(), []);
};

export const verifyStreamProposals = async ({
  request,
  staffCookie,
  callTool,
  review,
  tournament,
  match,
}: StreamProposalsContext) => {
  const proposed = {
    kind: "official",
    language: "en",
    url: "https://twitch.tv/integration_proposed",
  };

  const refused = await callTool(
    "set_match_streams",
    { matchId: match.id, streams: [proposed] },
    toolFailure,
  );

  assert.deepEqual(refused, { error: true }, "set_match_streams requires a sourceUrl");

  assert.deepEqual(
    await callTool(
      "set_tournament_streams",
      {
        sourceUrl: "https://www.start.gg/tournament/integration/event/main",
        streams: [proposed],
        tournamentId: tournament.id,
      },
      toolFailure,
    ),
    { error: true },
    "a start.gg source is refused",
  );

  const tournamentProposal = await callTool("set_tournament_streams", {
    sourceUrl: "https://x.com/integration/status/streams",
    streams: [proposed],
    tournamentId: tournament.id,
  });

  assert.equal(tournamentProposal.status, "pending");

  const response9 = await request(
    "GET",
    `/tournaments/${tournament.id}/streams`,
    undefined,
    staffCookie,
  );

  assert.deepEqual(response9.json(streamsResponse).streams, [], "nothing changes before approval");
  const reviewResult = await review(tournamentProposal);
  assert.equal(reviewResult.status, "applied");

  const response10 = await request("GET", `/tournaments/${tournament.id}`);
  const listed = response10.json(watchedTournament).tournament.watchStreams;

  assert.deepEqual(
    listed.map(({ url, source }) => [url, source]),
    [[proposed.url, "manual"]],
    "an approved stream list is manual data",
  );

  const callToolResult = await callTool(
    "get_tournament",
    { id: tournament.id },
    z.object({ streams: z.array(z.unknown()) }),
  );

  assert.equal(callToolResult.streams.length, 1, "MCP tournament reads return the streams");
  const upcoming = await callTool("get_upcoming_matches", {}, mcpMatches);

  const mcpMatch = [...(upcoming.live ?? []), ...(upcoming.upcoming ?? [])].find(
    (candidate) => candidate.id === match.id,
  );

  assert.ok(mcpMatch, "the upcoming match is listed through the MCP");
  assert.equal(mcpMatch.streams?.length, 1, "MCP match reads return inherited streams");

  const manual = await callTool("set_match_streams", {
    matchId: match.id,
    sourceUrl: "https://x.com/integration/status/2",
    streams: [
      {
        channel: "Integration B",
        kind: "costream",
        language: "fr",
        url: "https://twitch.tv/integration_b",
      },
    ],
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
};
