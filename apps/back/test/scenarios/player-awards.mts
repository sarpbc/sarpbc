import assert from "node:assert/strict";
import { z } from "zod";
import type { Request } from "./support.mts";

const tournamentAward = z.object({
  id: z.string(),
  awardType: z.string(),
  player: z.object({ id: z.string() }),
  participant: z.object({ id: z.string() }),
});

const awardBody = z.object({ award: tournamentAward });
const awardsBody = z.object({ awards: z.array(tournamentAward) });

const profileBody = z.object({
  awards: z.array(z.object({ id: z.string(), tournament: z.object({ id: z.string() }) })),
});

export interface PlayerAwardsContext {
  request: Request;
  staffCookie: string;
  memberCookie: string;
  competition: { tournamentId: string; participantId: string; playerId: string };
  outsiderPlayerId: string;
}

export const verifyPlayerAwards = async ({
  request,
  staffCookie,
  memberCookie,
  competition,
  outsiderPlayerId,
}: PlayerAwardsContext): Promise<void> => {
  const { tournamentId, participantId, playerId } = competition;
  const url = `/tournaments/${tournamentId}/awards`;
  const input = { participantId, playerId, awardType: "mvp" };
  await request("POST", url, input, memberCookie, 403);
  await request("POST", url, { ...input, playerId: outsiderPlayerId }, staffCookie, 400);

  const response = await request("POST", url, input, staffCookie, 201);
  const { award } = response.json(awardBody);

  assert.equal(award.player.id, playerId);
  assert.equal(award.participant.id, participantId);
  await request("POST", url, input, staffCookie, 409);
  await request("POST", url, { ...input, awardType: "season_mvp" }, staffCookie, 400);

  const response2 = await request(
    "POST",
    url,
    { ...input, awardType: "grand_finals_mvp" },
    staffCookie,
    201,
  );

  const grandFinals = response2.json(awardBody).award;

  await request("POST", url, { ...input, awardType: "grand_finals_mvp" }, staffCookie, 409);
  const response3 = await request("GET", url);
  const tournamentAwards = response3.json(awardsBody).awards;
  assert.deepEqual(
    tournamentAwards.map((a) => [a.id, a.awardType]),
    [
      [award.id, "mvp"],
      [grandFinals.id, "grand_finals_mvp"],
    ],
  );
  await request("DELETE", `${url}/${grandFinals.id}`, undefined, staffCookie, 204);

  const response4 = await request("GET", `/player/${playerId}/awards`);
  const profileAwards = response4.json(profileBody).awards;

  assert.ok(profileAwards.some((a) => a.id === award.id && a.tournament.id === tournamentId));
  await request("DELETE", `${url}/${award.id}`, undefined, memberCookie, 403);
  await request("DELETE", `${url}/${award.id}`, undefined, staffCookie, 204);
  const response5 = await request("GET", url);
  assert.deepEqual(response5.json(awardsBody).awards, []);
  const response6 = await request("GET", `/player/${playerId}/awards`);
  assert.deepEqual(response6.json(profileBody).awards, []);
  await request("DELETE", `${url}/${award.id}`, undefined, staffCookie, 404);
};
