import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function verifyMatchStats({
  app,
  orm,
  request,
  staffCookie,
  memberCookie,
  competition,
}) {
  const { RequestContext } = await import("@mikro-orm/core");
  const { MikroOrmGameStatsStore, MikroOrmStatsCandidates, MikroOrmStatsImportStore } =
    await import("../../src/match-stats/infrastructure/persistence/match-stats.store.ts");
  const { MatchGamePlayer } =
    await import("../../src/match-stats/infrastructure/persistence/match-stats.entities.ts");
  const { RosterMergeService } =
    await import("../../src/roster/application/roster-merge.service.ts");
  const { Player } = await import("../../src/roster/infrastructure/persistence/player.entities.ts");
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
  await assert.rejects(
    new MikroOrmGameStatsStore(orm.em.fork()).save({
      ...game,
      ballchasingId: "integration-replay-other",
      rocketLeagueId: "RL-other",
    }),
    "a match holds one game per number",
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
  assert.equal(candidate.finished, true);

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

  const em = orm.em.fork();
  const duplicateId = randomUUID();
  em.persist(em.create(Player, { id: duplicateId, name: "KC Veteran Twin", slug: duplicateId }));
  await em.flush();
  await new MikroOrmGameStatsStore(orm.em.fork()).save({
    ...game,
    number: 2,
    ballchasingId: "integration-replay-2",
    rocketLeagueId: "RL-2",
    players: [
      { ...stat, name: "KC Veteran", platformId: "a", side: "blue", playerId: duplicateId },
    ],
  });
  const merges = app.get(RosterMergeService);
  await RequestContext.create(orm.em.fork(), () => merges.mergePlayers(playerId, duplicateId));
  const statRows = (player) => orm.em.fork().count(MatchGamePlayer, { player });
  assert.equal(await statRows(duplicateId), 0, "a player merge leaves no stats on the duplicate");
  assert.equal(await statRows(playerId), 2, "a player merge moves stats to the kept player");
}
