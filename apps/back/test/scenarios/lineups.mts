import assert from "node:assert/strict";
import { z } from "zod";
import { toolFailure } from "./support.mts";
import type { CallTool, Request, Review } from "./support.mts";

const identified = z.looseObject({ id: z.string() });

const matchLineup = z.looseObject({
  participantId: z.string(),
  players: z.array(z.looseObject({ id: z.string(), standIn: z.boolean() })),
});

type MatchLineup = z.infer<typeof matchLineup>;

const matchLineupsResponse = z.looseObject({
  source: z.string(),
  lineups: z.array(matchLineup),
  suggested: z.array(z.unknown()),
});

const matchDetail = z.looseObject({
  lineups: z.array(matchLineup),
  match: z.looseObject({ tournament: z.looseObject({ source: z.string() }) }),
});

const standIns = z.object({
  standIns: z.array(
    z.looseObject({ participantId: z.string(), startgg: z.boolean(), match: identified }),
  ),
});

const createdPlayer = z.object({ player: identified });

const participant = z.looseObject({ id: z.string(), team: identified });

const startggCupBody = z.object({
  tournament: z.looseObject({ id: z.string(), participants: z.array(participant) }),
});

const lineupsTool = z.looseObject({ lineups: z.array(matchLineup) });

type SideRow = [participantId: string, players: [id: string, standIn: boolean][]];

type Identified = z.infer<typeof identified>;

interface Tournament {
  participants: z.infer<typeof participant>[];
}

interface LineupsContext {
  request: Request;
  staffCookie: string;
  memberCookie: string;
  tournament: Tournament;
  match: Identified;
  player: Identified;
}

export interface LineupFixtures {
  standIn: Identified;
  startggMatch: Identified;
}

interface LineupProposalsContext extends LineupFixtures {
  request: Request;
  staffCookie: string;
  callTool: CallTool;
  review: Review;
  tournament: Tournament;
  match: Identified;
  player: Identified;
}

const sides = (lineups: MatchLineup[]): SideRow[] =>
  lineups.map(({ participantId, players }) => [
    participantId,
    players.map(({ id, standIn }): [string, boolean] => [id, standIn]),
  ]);

const bySide = (lineups: MatchLineup[]): Partial<Record<string, SideRow[1]>> =>
  Object.fromEntries(sides(lineups));

export async function verifyLineups({
  request,
  staffCookie,
  memberCookie,
  tournament,
  match,
  player,
}: LineupsContext): Promise<LineupFixtures> {
  const lineupPath = `/tournaments/matches/${match.id}/lineups`;
  const [alpha, beta] = tournament.participants.map(({ id }) => id);

  const detailLineups = async (matchId: string): Promise<MatchLineup[]> =>
    (await request("GET", `/matches/${matchId}`)).json(matchDetail).lineups;

  const standInsOf = async (playerId: string) =>
    (await request("GET", `/player/${playerId}/stand-ins`)).json(standIns).standIns;

  await request("GET", lineupPath, undefined, memberCookie, 403);
  await request("PUT", lineupPath, { lineups: [] }, memberCookie, 403);
  assert.deepEqual(await detailLineups(match.id), [], "a match starts without lineups");

  const standIn = (
    await request("POST", "/player", { name: "Integration Stand-in" }, staffCookie, 201)
  ).json(createdPlayer).player;

  const saved = (
    await request(
      "PUT",
      lineupPath,
      { lineups: [{ participantId: alpha, playerIds: [player.id, standIn.id] }] },
      staffCookie,
    )
  ).json(matchLineupsResponse);

  assert.equal(saved.source, "manual");
  assert.deepEqual(saved.suggested, []);
  assert.deepEqual(sides(saved.lineups), [
    [
      alpha,
      [
        [player.id, false],
        [standIn.id, true],
      ],
    ],
  ]);
  assert.deepEqual(
    sides(await detailLineups(match.id)),
    sides(saved.lineups),
    "the public match page shows the lineup with the stand-in badge",
  );
  assert.deepEqual(
    (await standInsOf(standIn.id)).map(({ participantId, startgg, match: { id } }) => [
      participantId,
      startgg,
      id,
    ]),
    [[alpha, false, match.id]],
  );
  assert.deepEqual(await standInsOf(player.id), [], "a rostered player has no stand-in history");

  await request(
    "PUT",
    lineupPath,
    { lineups: [{ participantId: "not-a-participant", playerIds: [player.id] }] },
    staffCookie,
    400,
  );
  await request(
    "PUT",
    lineupPath,
    {
      lineups: [
        { participantId: alpha, playerIds: [player.id] },
        { participantId: beta, playerIds: [player.id] },
      ],
    },
    staffCookie,
    400,
  );
  await request(
    "PUT",
    lineupPath,
    { lineups: [{ participantId: alpha, playerIds: ["00000000-0000-4000-8000-000000000000"] }] },
    staffCookie,
    400,
  );
  await request(
    "PUT",
    "/tournaments/matches/00000000-0000-4000-8000-000000000000/lineups",
    { lineups: [] },
    staffCookie,
    404,
  );
  assert.equal((await detailLineups(match.id)).length, 1, "a refused lineup changes nothing");

  const replaced = (
    await request(
      "PUT",
      lineupPath,
      { lineups: [{ participantId: beta, playerIds: [standIn.id] }] },
      staffCookie,
    )
  ).json(matchLineupsResponse);

  assert.deepEqual(
    sides(replaced.lineups),
    [[beta, [[standIn.id, true]]]],
    "a new lineup replaces every previous side",
  );
  assert.deepEqual(
    (await standInsOf(standIn.id)).map(({ participantId }) => participantId),
    [beta],
  );

  const startggCup = (
    await request(
      "POST",
      "/tournaments",
      {
        name: "Integration start.gg Lineups",
        source: "startgg",
        teamIds: tournament.participants.map(({ team }) => team.id),
      },
      staffCookie,
      201,
    )
  ).json(startggCupBody).tournament;

  const startggMatch = (
    await request(
      "POST",
      `/tournaments/${startggCup.id}/matches`,
      {
        name: "Integration start.gg Final",
        participantIds: startggCup.participants.map(({ id }) => id),
        beginAt: new Date(Date.now() - 86_400_000).toISOString(),
        status: "finished",
      },
      staffCookie,
      201,
    )
  ).json(z.object({ match: identified })).match;

  const startggLineups = (
    await request(
      "PUT",
      `/tournaments/matches/${startggMatch.id}/lineups`,
      { lineups: [{ participantId: startggCup.participants[0].id, playerIds: [standIn.id] }] },
      staffCookie,
    )
  ).json(matchLineupsResponse);

  assert.equal(startggLineups.source, "startgg");
  const startggDetail = (await request("GET", `/matches/${startggMatch.id}`)).json(matchDetail);
  assert.deepEqual(
    sides(startggDetail.lineups),
    [[startggCup.participants[0].id, [[standIn.id, true]]]],
    "the site shows start.gg lineups",
  );
  assert.equal(startggDetail.match.tournament.source, "startgg", "with the source for the credit");
  assert.deepEqual(
    (await standInsOf(standIn.id)).map(({ startgg, match: { id } }) => [id, startgg]),
    [
      [match.id, false],
      [startggMatch.id, true],
    ],
    "the stand-in history keeps start.gg series, newest first, flagged for the credit",
  );

  return { standIn, startggMatch };
}

export async function verifyLineupProposals({
  request,
  staffCookie,
  callTool,
  review,
  tournament,
  match,
  player,
  standIn,
  startggMatch,
}: LineupProposalsContext): Promise<void> {
  const [alpha, beta] = tournament.participants.map(({ id }) => id);
  const sourceUrl = "https://x.com/integration/status/lineups";

  const lineups = [
    { participantId: alpha, playerIds: [player.id] },
    { participantId: beta, playerIds: [standIn.id] },
  ];

  const detail = async (): Promise<MatchLineup[]> =>
    (await request("GET", `/matches/${match.id}`)).json(matchDetail).lineups;

  assert.deepEqual(
    await callTool("set_match_lineups", { matchId: match.id, lineups }, toolFailure),
    { error: true },
    "set_match_lineups requires a sourceUrl",
  );
  assert.deepEqual(
    await callTool(
      "set_match_lineups",
      {
        matchId: startggMatch.id,
        lineups: [],
        sourceUrl,
      },
      toolFailure,
    ),
    { error: true },
    "start.gg match lineups cannot be proposed",
  );
  assert.deepEqual(
    await callTool(
      "set_match_lineups",
      {
        matchId: match.id,
        lineups,
        sourceUrl: "https://www.start.gg/tournament/integration/event/main",
      },
      toolFailure,
    ),
    { error: true },
    "start.gg sources are refused",
  );
  assert.deepEqual(
    await callTool("get_match_lineups", { matchId: startggMatch.id }, toolFailure),
    { error: true },
    "MCP reads leave start.gg lineups out",
  );

  const before = await detail();
  const proposal = await callTool("set_match_lineups", { matchId: match.id, lineups, sourceUrl });
  assert.equal(proposal.status, "pending");
  assert.deepEqual(await detail(), before, "nothing changes before approval");
  const applied = await review(proposal);
  assert.deepEqual([applied.status, applied.entityId], ["applied", match.id]);
  assert.deepEqual(
    bySide((await callTool("get_match_lineups", { matchId: match.id }, lineupsTool)).lineups),
    {
      [alpha]: [[player.id, false]],
      [beta]: [[standIn.id, true]],
    },
  );

  const duplicate = (
    await request("POST", "/player", { name: "Integration Stand-in Copy" }, staffCookie, 201)
  ).json(createdPlayer).player;

  await request(
    "PUT",
    `/tournaments/matches/${match.id}/lineups`,
    {
      lineups: [
        { participantId: alpha, playerIds: [player.id, duplicate.id] },
        { participantId: beta, playerIds: [standIn.id] },
      ],
    },
    staffCookie,
  );

  const merge = await callTool("merge_players", {
    keptPlayerId: standIn.id,
    duplicatePlayerId: duplicate.id,
    sourceUrl,
  });

  assert.equal((await review(merge)).status, "applied");
  assert.deepEqual(
    bySide(await detail()),
    { [alpha]: [[player.id, false]], [beta]: [[standIn.id, true]] },
    "a merge drops the duplicate's row when the kept player already plays the match",
  );

  await request("PUT", `/tournaments/matches/${match.id}/lineups`, { lineups: [] }, staffCookie);
  assert.deepEqual(await detail(), []);
}
