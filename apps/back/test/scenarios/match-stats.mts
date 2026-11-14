import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { StatsPlayerLinkInput, TournamentStatsGame } from "@sarpbc/types";
import { z } from "zod";
import type {
  GamePlayerRecord,
  GameRecord,
  PlayerLink,
} from "../../src/match-stats/application/ports.ts";
import type { Side } from "../../src/match-stats/domain/replay-matching.ts";
import type { Application, JsonResponse, Orm, Request } from "./support.mts";

interface MatchStatsContext {
  app: Application;
  orm: Orm;
  request: Request;
  staffCookie: string;
  memberCookie: string;
  competition: {
    tournamentId: string;
    participantId: string;
    rivalParticipantId: string;
    playerId: string;
    matchId: string;
  };
}

const identified = z.looseObject({ id: z.string() });

const errorBody = z.looseObject({ code: z.string() });

const deletedGame = z.looseObject({ number: z.number(), ballchasingId: z.string() });

const statsImports = z.object({
  imports: z.array(
    z.looseObject({ status: z.string(), error: z.string().nullable(), processed: z.number() }),
  ),
});

const matchGames = z.object({
  games: z.array(
    z.looseObject({
      number: z.number(),
      ballchasingId: z.string(),
      teams: z.array(
        z.looseObject({
          participantId: z.string(),
          goals: z.number(),
          players: z.array(z.looseObject({ name: z.string(), player: identified.nullable() })),
        }),
      ),
    }),
  ),
});

const stat = z.number();

const playerStats = z.looseObject({
  games: z.number(),
  unlinkedAccounts: z.number(),
  players: z.array(
    z.looseObject({
      player: identified,
      games: z.number(),
      goalParticipation: z.number(),
      totals: z.looseObject({
        goals: stat,
        assists: stat,
        saves: stat,
        shots: stat,
        demolitions: stat,
      }),
    }),
  ),
});

const tournamentBody = z.object({
  tournament: z.looseObject({
    name: z.string(),
    event: z.looseObject({ slug: z.string() }),
    participants: z.array(
      z.looseObject({ id: z.string(), team: z.looseObject({ name: z.string() }).nullish() }),
    ),
  }),
});

const statsPlayerAccounts = z.looseObject({
  players: z.array(
    z.looseObject({
      platform: z.string(),
      platformId: z.string(),
      name: z.string(),
      team: z.looseObject({ participantId: z.string(), name: z.string() }),
      games: z.number(),
      player: identified.nullable(),
    }),
  ),
  rosters: z.array(z.looseObject({ participantId: z.string(), players: z.array(identified) })),
});

const linkResult = z.looseObject({
  link: z.looseObject({ platform: z.string(), platformId: z.string(), playerId: z.string() }),
  linkedRows: z.number(),
});

const storedGames = z.object({
  games: z.array(
    z.looseObject({ matchId: z.string(), number: z.number(), ballchasingId: z.string() }),
  ),
});

const statKeys = ["goals", "assists", "saves", "shots", "demolitions"] as const;

export async function verifyMatchStats({
  app,
  orm,
  request,
  staffCookie,
  memberCookie,
  competition,
}: MatchStatsContext): Promise<void> {
  const { RequestContext } = await import("@mikro-orm/core");

  const { MikroOrmGameStatsStore, MikroOrmStatsCandidates, MikroOrmStatsImportStore } =
    await import("../../src/match-stats/infrastructure/persistence/match-stats.store.ts");

  const { MatchGamePlayer, PlayerPlatformLink } =
    await import("../../src/match-stats/infrastructure/persistence/match-stats.entities.ts");

  const { TournamentParticipant } =
    await import("../../src/tournament/infrastructure/competition-persistence.ts");

  const { RosterMergeService } =
    await import("../../src/roster/application/roster-merge.service.ts");

  const { Player } = await import("../../src/roster/infrastructure/persistence/player.entities.ts");
  const { tournamentId, participantId, rivalParticipantId, playerId, matchId } = competition;
  const importsUrl = `/tournaments/${tournamentId}/stats-imports`;

  await request("POST", importsUrl, { group: "pilot-group" }, memberCookie, 403);

  const unconfigured = (
    await request("POST", importsUrl, { group: "pilot-group" }, staffCookie, 500)
  ).json(errorBody);

  assert.equal(unconfigured.code, "ballchasing_not_configured");
  assert.deepEqual(
    (await request("GET", importsUrl, undefined, staffCookie)).json(statsImports).imports,
    [],
  );

  const stat = { platform: "epic", goals: 1, assists: 0, saves: 2, shots: 3, demolitions: 1 };

  const game: GameRecord = {
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
    learnedLinks: [],
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
      ...(await new MikroOrmGameStatsStore(orm.em.fork()).locations([
        "integration-replay-1",
        "other",
      ])),
    ],
    [["integration-replay-1", { matchId, number: 1 }]],
  );

  const [shown] = (await request("GET", `/matches/${matchId}`)).json(matchGames).games;

  assert.equal(shown.number, 1);
  assert.equal(shown.ballchasingId, "integration-replay-1");
  assert.deepEqual(
    shown.teams.map((team) => [team.participantId, team.goals]),
    [
      [participantId, 1],
      [rivalParticipantId, 0],
    ],
  );
  assert.equal(shown.teams[0].players[0].player?.id, playerId);
  assert.equal(shown.teams[1].players[0].player, null);
  assert.equal(shown.teams[1].players[0].name, "Stand-in");

  const candidate = (await new MikroOrmStatsCandidates(orm.em.fork()).matches(tournamentId)).find(
    (match) => match.id === matchId,
  );

  assert.ok(candidate, "the match is a stats candidate");
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

  const [listed] = (await request("GET", importsUrl, undefined, staffCookie)).json(
    statsImports,
  ).imports;

  assert.equal(listed.status, "failed");
  assert.equal(listed.error, "restarted");
  assert.equal(listed.processed, 1);

  const em = orm.em.fork();
  const duplicateId = randomUUID();
  em.persist(
    em.create(Player, {
      id: duplicateId,
      name: "KC Veteran Twin",
      slug: duplicateId,
      status: "active",
      source: "manual",
    }),
  );
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
  await RequestContext.create(
    orm.em.fork(),
    async () => await merges.mergePlayers(playerId, duplicateId),
  );

  const statRows = async (player: string): Promise<number> =>
    await orm.em.fork().count(MatchGamePlayer, { player });

  assert.equal(await statRows(duplicateId), 0, "a player merge leaves no stats on the duplicate");
  assert.equal(await statRows(playerId), 2, "a player merge moves stats to the kept player");

  const stageStats = (await request("GET", `/tournaments/${tournamentId}/player-stats`)).json(
    playerStats,
  );

  assert.equal(stageStats.games, 2);
  assert.equal(stageStats.unlinkedAccounts, 1, "an unlinked account is counted, not listed");
  assert.equal(stageStats.players.length, 1);
  const [veteran] = stageStats.players;
  assert.equal(veteran.player.id, playerId);
  assert.equal(veteran.games, 2);

  const veteranRows = await orm.em
    .fork()
    .find(MatchGamePlayer, { player: playerId, game: { match: { tournament: tournamentId } } });

  for (const key of statKeys)
    assert.equal(
      veteran.totals[key],
      veteranRows.reduce((sum, row) => sum + row[key], 0),
      `${key} totals match the sum of the games`,
    );
  assert.equal(veteran.goalParticipation, 100);

  const { event } = (await request("GET", `/tournaments/${tournamentId}`)).json(
    tournamentBody,
  ).tournament;

  assert.deepEqual(
    (await request("GET", `/events/${event.slug}/player-stats`)).json(playerStats),
    stageStats,
    "an event of one stage aggregates like the stage",
  );
  await request("GET", `/events/${randomUUID()}/player-stats`, undefined, undefined, 404);

  const linksUrl = `/tournaments/${tournamentId}/stats-players`;
  await request("GET", linksUrl, undefined, undefined, 401);
  await request("GET", linksUrl, undefined, memberCookie, 403);
  await request(
    "PUT",
    `${linksUrl}/link`,
    { platform: "steam", platformId: "s-renamed", playerId },
    memberCookie,
    403,
  );

  const otherId = randomUUID();
  const twinId = randomUUID();
  const setup = orm.em.fork();
  setup.persist([
    setup.create(Player, {
      id: otherId,
      name: "Rival Regular",
      slug: otherId,
      status: "active",
      source: "manual",
    }),
    setup.create(Player, {
      id: twinId,
      name: "Rival Twin",
      slug: twinId,
      status: "active",
      source: "manual",
    }),
  ]);
  await setup.flush();

  const rival = await setup.findOneOrFail(TournamentParticipant, rivalParticipantId, {
    populate: ["players"],
  });

  rival.players.add(setup.getReference(Player, otherId));
  await setup.flush();

  const saveGame = async (
    number: number,
    players: GamePlayerRecord[],
    learnedLinks: PlayerLink[] = [],
  ): Promise<TournamentStatsGame> =>
    await new MikroOrmGameStatsStore(orm.em.fork()).save({
      ...game,
      number,
      ballchasingId: `integration-replay-${number}`,
      rocketLeagueId: `RL-${number}`,
      players,
      learnedLinks,
    });

  const steam = (
    platformId: string,
    name: string,
    side: Side,
    rowPlayerId: string | null = null,
  ): GamePlayerRecord => ({
    ...stat,
    platform: "steam",
    platformId,
    name,
    side,
    playerId: rowPlayerId,
  });

  const linkOf = async (platformId: string): Promise<string | null> =>
    (await orm.em.fork().findOne(PlayerPlatformLink, { platform: "steam", platformId }))?.player
      .id ?? null;

  const rowPlayers = async (platformId: string): Promise<(string | null)[]> =>
    (
      await orm.em
        .fork()
        .find(MatchGamePlayer, { platform: "steam", platformId }, { orderBy: { name: "ASC" } })
    ).map((row) => row.player?.id ?? null);

  await saveGame(3, [steam("s-learn", "Old Name", "blue"), steam("s-renamed", "Racer", "orange")]);
  await saveGame(
    4,
    [steam("s-learn", "KC Veteran", "blue", playerId)],
    [{ platform: "steam", platformId: "s-learn", playerId }],
  );
  assert.equal(await linkOf("s-learn"), playerId, "a unique name match teaches a link");
  assert.deepEqual(
    await rowPlayers("s-learn"),
    [playerId, playerId],
    "learning links earlier unlinked rows of the account",
  );

  const accounts = async (): Promise<z.infer<typeof statsPlayerAccounts>> =>
    (await request("GET", linksUrl, undefined, staffCookie)).json(statsPlayerAccounts);

  const known = await accounts();
  const unlinked = known.players.filter((account) => account.player === null);
  assert.deepEqual(unlinked, [
    {
      platform: "steam",
      platformId: "s-renamed",
      name: "Racer",
      team: { participantId: rivalParticipantId, name: unlinked[0].team.name },
      games: 1,
      player: null,
    },
  ]);
  assert.equal(
    known.players.find((account) => account.platformId === "s-learn")?.player?.id,
    playerId,
    "linked accounts are listed with their player so a wrong link can be corrected",
  );
  assert.ok(
    !known.players.some((account) => account.name === "Stand-in"),
    "rows without a platform id cannot be linked and are not listed",
  );

  const rosterIds = (participant: string): string[] => {
    const roster = known.rosters.find((entry) => entry.participantId === participant);
    assert.ok(roster, "the participant has a roster");

    return roster.players.map((player) => player.id);
  };

  assert.ok(rosterIds(rivalParticipantId).includes(otherId));
  assert.ok(
    rosterIds(participantId).includes(playerId),
    "every roster of the tournament is offered",
  );

  const link = async (body: StatsPlayerLinkInput, status?: number): Promise<JsonResponse> =>
    await request("PUT", `${linksUrl}/link`, body, staffCookie, status);

  await link({ platform: "steam", platformId: " ", playerId }, 400);
  await link({ platform: "steam", platformId: "s-renamed", playerId: twinId }, 400);

  const outsider = (
    await link({ platform: "steam", platformId: "s-renamed", playerId: randomUUID() }, 400)
  ).json(errorBody);

  assert.equal(outsider.code, "player_not_on_tournament_roster");
  await request(
    "PUT",
    `/tournaments/${randomUUID()}/stats-players/link`,
    { platform: "steam", platformId: "s-renamed", playerId },
    staffCookie,
    404,
  );
  assert.equal(await linkOf("s-renamed"), null, "a rejected link writes nothing");

  assert.deepEqual(
    (await link({ platform: "steam", platformId: "s-renamed", playerId: otherId })).json(
      linkResult,
    ),
    { link: { platform: "steam", platformId: "s-renamed", playerId: otherId }, linkedRows: 1 },
  );
  assert.deepEqual(
    (await link({ platform: "steam", platformId: "s-learn", playerId: otherId })).json(linkResult)
      .linkedRows,
    2,
    "a staff link repoints rows already linked to another player",
  );
  assert.equal(await linkOf("s-learn"), otherId, "a staff link replaces the previous one");
  assert.deepEqual(await rowPlayers("s-learn"), [otherId, otherId]);
  assert.deepEqual(
    (await accounts()).players.filter((account) => account.player === null),
    [],
  );

  await saveGame(
    5,
    [steam("s-learn", "KC Veteran", "blue", playerId)],
    [{ platform: "steam", platformId: "s-learn", playerId }],
  );
  assert.equal(await linkOf("s-learn"), otherId, "learning never overwrites an existing link");

  const { games } = (await request("GET", `/matches/${matchId}`)).json(matchGames);

  const thirdGame = games.find((shownGame) => shownGame.number === 3);
  assert.ok(thirdGame, "game 3 is shown");

  const repaired = thirdGame.teams
    .flatMap((team) => team.players)
    .find((row) => row.name === "Racer");

  assert.ok(repaired, "the renamed racer is shown");
  assert.deepEqual(repaired.player, { id: otherId, name: "Rival Regular", slug: otherId });
  assert.ok(!JSON.stringify(games).includes("s-renamed"), "the public match omits platform ids");

  const twinLink = orm.em.fork();
  twinLink.persist(
    twinLink.create(PlayerPlatformLink, {
      platform: "steam",
      platformId: "s-twin",
      player: twinId,
    }),
  );
  await twinLink.flush();
  await RequestContext.create(
    orm.em.fork(),
    async () => await merges.mergePlayers(otherId, twinId),
  );
  assert.equal(await linkOf("s-twin"), otherId, "a player merge moves links to the kept player");

  const gamesUrl = `/tournaments/${tournamentId}/stats-games`;

  const attach = {
    matchId,
    replay: "0d1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
    gameNumber: 6,
    blueParticipantId: participantId,
  };

  await request("GET", gamesUrl, undefined, undefined, 401);
  await request("GET", gamesUrl, undefined, memberCookie, 403);
  await request("POST", gamesUrl, attach, memberCookie, 403);
  await request("DELETE", `${gamesUrl}/${matchId}/3`, undefined, memberCookie, 403);
  assert.equal(
    (await request("POST", gamesUrl, attach, staffCookie, 500)).json(errorBody).code,
    "ballchasing_not_configured",
  );
  assert.deepEqual(
    (await request("GET", gamesUrl, undefined, staffCookie))
      .json(storedGames)
      .games.map((stored) => [stored.matchId, stored.number, stored.ballchasingId]),
    [1, 2, 3, 4, 5].map((number) => [matchId, number, `integration-replay-${number}`]),
  );

  const store = () => new MikroOrmGameStatsStore(orm.em.fork());

  const { tournament } = (await request("GET", `/tournaments/${tournamentId}`)).json(
    tournamentBody,
  );

  const teamName = (id: string): string | undefined =>
    tournament.participants.find((entry) => entry.id === id)?.team?.name;

  assert.deepEqual(await store().attachment("integration-replay-3"), {
    matchId,
    number: 3,
    tournamentName: tournament.name,
    teams: [teamName(participantId), teamName(rivalParticipantId)],
  });
  assert.equal(await store().attachment("never-attached"), null);

  const removed = (
    await request("DELETE", `${gamesUrl}/${matchId}/3`, undefined, staffCookie)
  ).json(deletedGame);

  assert.deepEqual([removed.number, removed.ballchasingId], [3, "integration-replay-3"]);
  assert.equal(await rowPlayers("s-renamed").then((rows) => rows.length), 0, "player rows go too");
  assert.deepEqual(
    [...(await store().excluded(["integration-replay-3", "integration-replay-4"]))],
    ["integration-replay-3"],
  );
  assert.deepEqual(
    [...(await store().locations(["integration-replay-3", "integration-replay-4"])).keys()],
    ["integration-replay-4"],
  );
  await request("DELETE", `${gamesUrl}/${matchId}/3`, undefined, staffCookie, 404);
  await request(
    "DELETE",
    `/tournaments/${randomUUID()}/stats-games/${matchId}/4`,
    undefined,
    staffCookie,
    404,
  );

  const candidateAfter = (
    await new MikroOrmStatsCandidates(orm.em.fork()).matches(tournamentId)
  ).find((match) => match.id === matchId);

  assert.ok(candidateAfter, "the match is still a stats candidate");
  assert.ok(!candidateAfter.storedReplayIds.includes("integration-replay-3"));

  await saveGame(3, [steam("s-renamed", "Racer", "orange", otherId)]);
  assert.equal(
    (await store().excluded(["integration-replay-3"])).size,
    0,
    "attaching a removed replay again clears its exclusion",
  );
}
