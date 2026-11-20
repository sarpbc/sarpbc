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
  lineups: z.array(matchLineup),
  suggested: z.array(z.unknown()),
});

const matchDetail = z.looseObject({ lineups: z.array(matchLineup) });

const standIns = z.object({
  standIns: z.array(z.looseObject({ match: identified, participantId: z.string() })),
});

const createdPlayer = z.object({ player: identified });

const participant = z.looseObject({ id: z.string(), team: identified });

const lineupsTool = z.looseObject({ lineups: z.array(matchLineup) });

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

const sides = (lineups: MatchLineup[]) =>
  lineups.map(
    ({ participantId, players }) =>
      [
        participantId,
        players.map(({ id, standIn }) => [id, standIn] satisfies [string, boolean]),
      ] satisfies [string, [string, boolean][]],
  );

const bySide = (lineups: MatchLineup[]) => Object.fromEntries(sides(lineups));

export const verifyLineups = async ({
  request,
  staffCookie,
  memberCookie,
  tournament,
  match,
  player,
}: LineupsContext) => {
  const lineupPath = `/tournaments/matches/${match.id}/lineups`;
  const [alpha, beta] = tournament.participants.map(({ id }) => id);

  const detailLineups = async (matchId: string) => {
    const response = await request("GET", `/matches/${matchId}`);

    return response.json(matchDetail).lineups;
  };

  const standInsOf = async (playerId: string) => {
    const response2 = await request("GET", `/player/${playerId}/stand-ins`);

    return response2.json(standIns).standIns;
  };

  await request("GET", lineupPath, undefined, memberCookie, 403);
  await request("PUT", lineupPath, { lineups: [] }, memberCookie, 403);
  assert.deepEqual(await detailLineups(match.id), [], "a match starts without lineups");

  const response3 = await request(
    "POST",
    "/player",
    { name: "Integration Stand-in" },
    staffCookie,
    201,
  );

  const standIn = response3.json(createdPlayer).player;

  const response4 = await request(
    "PUT",
    lineupPath,
    { lineups: [{ participantId: alpha, playerIds: [player.id, standIn.id] }] },
    staffCookie,
  );

  const saved = response4.json(matchLineupsResponse);

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
  const standInsOfResult = await standInsOf(standIn.id);
  assert.deepEqual(
    standInsOfResult.map(({ participantId, match: { id } }) => [participantId, id]),
    [[alpha, match.id]],
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
  const detailLineupsResult = await detailLineups(match.id);
  assert.equal(detailLineupsResult.length, 1, "a refused lineup changes nothing");

  const response5 = await request(
    "PUT",
    lineupPath,
    { lineups: [{ participantId: beta, playerIds: [standIn.id] }] },
    staffCookie,
  );

  const replaced = response5.json(matchLineupsResponse);

  assert.deepEqual(
    sides(replaced.lineups),
    [[beta, [[standIn.id, true]]]],
    "a new lineup replaces every previous side",
  );
  const standInsOfResult2 = await standInsOf(standIn.id);
  assert.deepEqual(
    standInsOfResult2.map(({ participantId }) => participantId),
    [beta],
  );

  return { standIn };
};

export const verifyLineupProposals = async ({
  request,
  staffCookie,
  callTool,
  review,
  tournament,
  match,
  player,
  standIn,
}: LineupProposalsContext) => {
  const [alpha, beta] = tournament.participants.map(({ id }) => id);
  const sourceUrl = "https://x.com/integration/status/lineups";

  const lineups = [
    { participantId: alpha, playerIds: [player.id] },
    { participantId: beta, playerIds: [standIn.id] },
  ];

  const detail = async () => {
    const response10 = await request("GET", `/matches/${match.id}`);

    return response10.json(matchDetail).lineups;
  };

  assert.deepEqual(
    await callTool("set_match_lineups", { lineups, matchId: match.id }, toolFailure),
    { error: true },
    "set_match_lineups requires a sourceUrl",
  );
  assert.deepEqual(
    await callTool(
      "set_match_lineups",
      {
        lineups,
        matchId: match.id,
        sourceUrl: "https://www.start.gg/tournament/integration/event/main",
      },
      toolFailure,
    ),
    { error: true },
    "start.gg sources are refused",
  );

  const before = await detail();
  const proposal = await callTool("set_match_lineups", { lineups, matchId: match.id, sourceUrl });
  assert.equal(proposal.status, "pending");
  assert.deepEqual(await detail(), before, "nothing changes before approval");
  const applied = await review(proposal);
  assert.deepEqual([applied.status, applied.entityId], ["applied", match.id]);
  const callToolResult = await callTool("get_match_lineups", { matchId: match.id }, lineupsTool);
  assert.deepEqual(bySide(callToolResult.lineups), {
    [alpha]: [[player.id, false]],
    [beta]: [[standIn.id, true]],
  });

  const response11 = await request(
    "POST",
    "/player",
    { name: "Integration Stand-in Copy" },
    staffCookie,
    201,
  );

  const duplicate = response11.json(createdPlayer).player;

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
    duplicatePlayerId: duplicate.id,
    keptPlayerId: standIn.id,
    sourceUrl,
  });

  const reviewResult = await review(merge);
  assert.equal(reviewResult.status, "applied");
  assert.deepEqual(
    bySide(await detail()),
    { [alpha]: [[player.id, false]], [beta]: [[standIn.id, true]] },
    "a merge drops the duplicate's row when the kept player already plays the match",
  );

  await request("PUT", `/tournaments/matches/${match.id}/lineups`, { lineups: [] }, staffCookie);
  assert.deepEqual(await detail(), []);
};
