import assert from "node:assert/strict";

export async function verifyMatchStats({ orm, request, staffCookie, memberCookie, competition }) {
  const { MikroOrmGameStatsStore, MikroOrmStatsCandidates, MikroOrmStatsImportStore } =
    await import("../../src/match-stats/infrastructure/persistence/match-stats.store.ts");
  const { MatchGamePlayer } =
    await import("../../src/match-stats/infrastructure/persistence/match-stats.entities.ts");
  const { tournamentId, participantId, rivalParticipantId, playerId, matchId } = competition;
  const importsUrl = `/tournaments/${tournamentId}/stats-imports`;

  await request("POST", importsUrl, { group: "pilot-group" }, memberCookie, 403);
  const unconfigured = (
    await request("POST", importsUrl, { group: "pilot-group" }, staffCookie, 500)
  ).json();
  assert.equal(unconfigured.code, "ballchasing_not_configured");
  assert.deepEqual((await request("GET", importsUrl, undefined, staffCookie)).json().imports, []);

  const stat = { platform: "epic", goals: 1, assists: 0, saves: 2, shots: 3, demolitions: 1 };
  const game = {
    matchId,
    number: 1,
    ballchasingId: "integration-replay-1",
    rocketLeagueId: "RL-1",
    playedAt: new Date(),
    blueParticipantId: participantId,
    orangeParticipantId: rivalParticipantId,
    blueGoals: 1,
    orangeGoals: 0,
    players: [
      { ...stat, name: "KC Veteran", platformId: "a", side: "blue", playerId },
      { ...stat, name: "Stand-in", platformId: null, side: "orange", playerId: null, goals: 0 },
    ],
  };
  await new MikroOrmGameStatsStore(orm.em.fork()).save(game);
  await assert.rejects(
    new MikroOrmGameStatsStore(orm.em.fork()).save({ ...game, number: 2 }),
    "the Ballchasing replay id is unique",
  );
  assert.equal(
    await orm.em.fork().count(MatchGamePlayer, {}),
    2,
    "a rejected game leaves no player rows",
  );
  assert.deepEqual(
    [
      ...(await new MikroOrmGameStatsStore(orm.em.fork()).importedReplayIds([
        "integration-replay-1",
        "other",
      ])),
    ],
    ["integration-replay-1"],
  );

  const [shown] = (await request("GET", `/matches/${matchId}`)).json().games;
  assert.equal(shown.number, 1);
  assert.equal(shown.ballchasingId, "integration-replay-1");
  assert.deepEqual(
    shown.teams.map((team) => [team.participantId, team.goals]),
    [
      [participantId, 1],
      [rivalParticipantId, 0],
    ],
  );
  assert.equal(shown.teams[0].players[0].player.id, playerId);
  assert.equal(shown.teams[1].players[0].player, null);
  assert.equal(shown.teams[1].players[0].name, "Stand-in");

  const candidate = (await new MikroOrmStatsCandidates(orm.em.fork()).matches(tournamentId)).find(
    (match) => match.id === matchId,
  );
  assert.deepEqual(candidate.storedReplayIds, ["integration-replay-1"]);
  assert.equal(candidate.participants.length, 2);
  assert.equal(candidate.scores.size, 2);

  const imports = new MikroOrmStatsImportStore(orm.em.fork());
  await imports.create({
    id: "00000000-0000-4000-8000-000000000021",
    tournamentId,
    groupId: "pilot-group",
    status: "running",
    total: 3,
    processed: 1,
    items: [],
    error: null,
    createdAt: new Date(),
    startedAt: new Date(),
    finishedAt: null,
  });
  assert.equal(await new MikroOrmStatsImportStore(orm.em.fork()).failUnfinished("restarted"), 1);
  const [listed] = (await request("GET", importsUrl, undefined, staffCookie)).json().imports;
  assert.equal(listed.status, "failed");
  assert.equal(listed.error, "restarted");
  assert.equal(listed.processed, 1);
}
