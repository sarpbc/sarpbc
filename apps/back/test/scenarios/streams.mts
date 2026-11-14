import assert from "node:assert/strict";
import type { Stream, StreamsResponse } from "@sarpbc/types";
import type { CallTool, Request, Review, ToolFailure } from "./support.mts";

interface WatchedMatch {
  watchStreams: Stream[];
}

interface WatchedTournament {
  id: string;
  watchStreams: Stream[];
}

interface McpMatches {
  live?: { id: string; streams: Stream[] }[];
  upcoming?: { id: string; streams: Stream[] }[];
}

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

const urls = (streams: { url: string }[]): string[] => streams.map((stream) => stream.url);

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

  const watched = async (): Promise<Stream[]> =>
    (await request("GET", `/matches/${match.id}`)).json<{ match: WatchedMatch }>().match
      .watchStreams;

  const stage = async (): Promise<WatchedTournament> =>
    (await request("GET", `/tournaments/${tournament.id}`)).json<{
      tournament: WatchedTournament;
    }>().tournament;

  await request("GET", tournamentPath, undefined, memberCookie, 403);
  await request("PUT", tournamentPath, { streams: [] }, memberCookie, 403);
  assert.deepEqual(await watched(), []);
  assert.deepEqual((await stage()).watchStreams, []);

  const event = (
    await request(
      "PUT",
      eventPath,
      {
        streams: [{ url: "https://twitch.tv/integration_event", language: "en", kind: "official" }],
      },
      staffCookie,
    )
  ).json<StreamsResponse>();

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
  assert.deepEqual(urls((await stage()).watchStreams), ["https://twitch.tv/integration_event"]);
  assert.deepEqual(urls(await watched()), ["https://twitch.tv/integration_event"]);

  const tournamentList = [
    { url: "https://twitch.tv/integration_cup", language: "en", kind: "official" },
    { url: "https://kick.com/integration_fr", language: "FR", kind: "costream" },
  ];

  const saved = (
    await request("PUT", tournamentPath, { streams: tournamentList }, staffCookie)
  ).json<StreamsResponse>();

  assert.deepEqual(urls(saved.streams), urls(tournamentList));
  assert.deepEqual(urls(saved.inherited), ["https://twitch.tv/integration_event"]);
  assert.deepEqual(
    saved.streams.map((stream) => [stream.platform, stream.language]),
    [
      ["twitch", "en"],
      ["kick", "fr"],
    ],
  );
  assert.deepEqual(urls((await stage()).watchStreams), urls(tournamentList));
  assert.deepEqual(
    urls(await watched()),
    urls(tournamentList),
    "a match without its own list shows the tournament list",
  );
  assert.deepEqual(
    (await request("GET", matchPath, undefined, staffCookie)).json<StreamsResponse>(),
    {
      streams: [],
      inherited: saved.streams,
    },
  );

  const override = [
    { url: "https://www.youtube.com/@IntegrationB/live", language: "en", kind: "official" },
  ];

  const overridden = (
    await request("PUT", matchPath, { streams: override }, staffCookie)
  ).json<StreamsResponse>();

  assert.equal(overridden.streams[0].channel, "@IntegrationB");
  assert.deepEqual(
    urls(await watched()),
    urls(override),
    "the match override replaces the tournament list",
  );
  assert.deepEqual(urls((await stage()).watchStreams), urls(tournamentList));

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

  const startggCup = (
    await request(
      "POST",
      "/tournaments",
      { name: "Integration start.gg Cup", source: "startgg" },
      staffCookie,
      201,
    )
  ).json<{ tournament: { id: string } }>().tournament;

  const startggStreams = (
    await request(
      "PUT",
      `/tournaments/${startggCup.id}/streams`,
      {
        streams: [
          { url: "https://twitch.tv/integration_startgg_cup", language: "en", kind: "official" },
        ],
      },
      staffCookie,
    )
  ).json<StreamsResponse>().streams;

  assert.deepEqual(
    startggStreams.map((stream) => stream.source),
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
  const stream = { url: "https://twitch.tv/integration_startgg", language: "en", kind: "official" };

  const refused = await callTool<ToolFailure>("set_match_streams", {
    matchId: match.id,
    streams: [stream],
  });

  assert.deepEqual(refused, { error: true }, "set_match_streams requires a sourceUrl");

  const startgg = await callTool("set_tournament_streams", {
    tournamentId: tournament.id,
    streams: [stream],
    sourceUrl: "https://www.start.gg/tournament/integration/event/main",
  });

  assert.equal(startgg.status, "pending");
  assert.deepEqual(
    (
      await request("GET", `/tournaments/${tournament.id}/streams`, undefined, staffCookie)
    ).json<StreamsResponse>().streams,
    [],
    "nothing changes before approval",
  );
  assert.equal((await review(startgg)).status, "applied");

  const listed = (await request("GET", `/tournaments/${tournament.id}`)).json<{
    tournament: WatchedTournament;
  }>().tournament.watchStreams;

  assert.deepEqual(
    listed.map(({ url, source }) => [url, source]),
    [[stream.url, "startgg"]],
    "the site keeps start.gg streams with their source for the credit",
  );
  assert.deepEqual(
    (await callTool<{ streams: Stream[] }>("get_tournament", { id: tournament.id })).streams,
    [],
  );
  const upcoming = await callTool<McpMatches>("get_upcoming_matches", {});

  const mcpMatch = [...(upcoming.live ?? []), ...(upcoming.upcoming ?? [])].find(
    (candidate) => candidate.id === match.id,
  );

  assert(mcpMatch, "the upcoming match is listed through the MCP");
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

  assert.equal((await review(manual)).status, "applied");

  const watch = (await request("GET", `/matches/${match.id}`)).json<{ match: WatchedMatch }>().match
    .watchStreams;

  assert.deepEqual(
    watch.map(({ channel, source }) => [channel, source]),
    [["Integration B", "manual"]],
  );

  await request("PUT", `/tournaments/matches/${match.id}/streams`, { streams: [] }, staffCookie);
  await request("PUT", `/tournaments/${tournament.id}/streams`, { streams: [] }, staffCookie);
}
