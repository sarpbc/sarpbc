import assert from "node:assert/strict";

export async function verifyPlayerAwards({
  request,
  staffCookie,
  memberCookie,
  competition,
  outsiderPlayerId,
}) {
  const { tournamentId, participantId, playerId } = competition;
  const url = `/tournaments/${tournamentId}/awards`;
  const input = { participantId, playerId, awardType: "mvp" };
  await request("POST", url, input, memberCookie, 403);
  await request("POST", url, { ...input, playerId: outsiderPlayerId }, staffCookie, 400);
  const award = (await request("POST", url, input, staffCookie, 201)).json().award;
  assert.equal(award.player.id, playerId);
  assert.equal(award.participant.id, participantId);
  await request("POST", url, input, staffCookie, 409);
  await request("POST", url, { ...input, awardType: "season_mvp" }, staffCookie, 400);

  const grandFinals = (
    await request("POST", url, { ...input, awardType: "grand_finals_mvp" }, staffCookie, 201)
  ).json().award;

  await request("POST", url, { ...input, awardType: "grand_finals_mvp" }, staffCookie, 409);
  const tournamentAwards = (await request("GET", url)).json().awards;
  assert.deepEqual(
    tournamentAwards.map((a) => [a.id, a.awardType]),
    [
      [award.id, "mvp"],
      [grandFinals.id, "grand_finals_mvp"],
    ],
  );
  await request("DELETE", `${url}/${grandFinals.id}`, undefined, staffCookie, 204);
  const profileAwards = (await request("GET", `/player/${playerId}/awards`)).json().awards;
  assert(profileAwards.some((a) => a.id === award.id && a.tournament.id === tournamentId));
  await request("DELETE", `${url}/${award.id}`, undefined, memberCookie, 403);
  await request("DELETE", `${url}/${award.id}`, undefined, staffCookie, 204);
  assert.deepEqual((await request("GET", url)).json().awards, []);
  assert.deepEqual((await request("GET", `/player/${playerId}/awards`)).json().awards, []);
  await request("DELETE", `${url}/${award.id}`, undefined, staffCookie, 404);
}
