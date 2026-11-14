import assert from "node:assert/strict";
import { z } from "zod";
import { byJoined } from "./support.mts";
import type { Application, Orm, Request, RequestContextType } from "./support.mts";

export interface PlayerTournamentsContext {
  app: Application;
  orm: Orm;
  request: Request;
  staffCookie: string;
  memberCookie: string;
  RequestContext: RequestContextType;
}

const playerRef = z.object({ id: z.string(), name: z.string(), slug: z.string() });

type PlayerRef = z.infer<typeof playerRef>;

const playerBody = z.object({ player: playerRef });

const soloTournamentBody = z.object({
  tournament: z.object({
    id: z.string(),
    format: z.string(),
    participants: z.array(
      z.object({ id: z.string(), team: z.null(), players: z.array(playerRef) }),
    ),
  }),
});

const soloMatchBody = z.object({ match: z.object({ id: z.string(), slug: z.string() }) });

const tournamentDetailBody = z.object({
  tournament: z.object({
    format: z.string(),
    matches: z.array(
      z.object({
        winnerId: z.string().nullable(),
        participants: z.array(
          z.strictObject({ id: z.string(), team: z.null(), players: z.array(playerRef) }),
        ),
      }),
    ),
  }),
});

const matchResultsBody = z.object({
  results: z.array(
    z.object({
      participants: z.array(
        z.object({ team: z.unknown(), players: z.array(z.unknown()).optional() }),
      ),
    }),
  ),
});

const playedTournamentsBody = z.object({ tournaments: z.array(z.object({ id: z.string() })) });

const gameBody = z.object({
  games: z.array(
    z.object({
      teams: z.array(
        z.object({
          participantId: z.string(),
          players: z.array(z.object({ player: z.object({ id: z.string() }) })),
        }),
      ),
    }),
  ),
});

export async function verifyPlayerTournaments({
  app,
  orm,
  request,
  staffCookie,
  memberCookie,
  RequestContext,
}: PlayerTournamentsContext): Promise<void> {
  const { MatchService } = await import("../../src/tournament/application/match/match.service.ts");

  const { RosterMergeService } =
    await import("../../src/roster/application/roster-merge.service.ts");

  const { ConflictError } = await import("../../src/common/domain/errors.ts");
  const { Team } = await import("../../src/roster/infrastructure/persistence/player.entities.ts");

  const { MikroOrmGameStatsStore, MikroOrmStatsCandidates } =
    await import("../../src/match-stats/infrastructure/persistence/match-stats.store.ts");

  const { assignReplays } = await import("../../src/match-stats/domain/replay-matching.ts");

  const createPlayer = async (name: string): Promise<PlayerRef> =>
    (await request("POST", "/player", { name }, staffCookie, 201)).json(playerBody).player;

  const solo = await createPlayer("Fake Solo One");
  const rival = await createPlayer("Fake Solo Two");
  const teamsBefore = await orm.em.fork().count(Team, {});

  await request(
    "POST",
    "/tournaments",
    { name: "Fake Knockout", format: "1v1", playerParticipants: [[solo.id]] },
    memberCookie,
    403,
  );
  await request(
    "POST",
    "/tournaments",
    { name: "Fake Knockout", format: "1v1", playerParticipants: [[solo.id, rival.id]] },
    staffCookie,
    400,
  );

  const { tournament } = (
    await request(
      "POST",
      "/tournaments",
      { name: "Fake Knockout", format: "1v1", playerParticipants: [[solo.id], [rival.id]] },
      staffCookie,
      201,
    )
  ).json(soloTournamentBody);

  assert.equal(tournament.format, "1v1");
  assert.ok(tournament.participants.every((participant) => participant.team === null));
  assert.deepEqual(
    tournament.participants
      .map((participant) => participant.players.map(({ id }) => id))
      .sort(byJoined),
    [[solo.id], [rival.id]].sort(byJoined),
  );
  assert.equal(await orm.em.fork().count(Team, {}), teamsBefore, "no team is created for players");

  const participantOf = (playerId: string): string => {
    const participant = tournament.participants.find((entry) => entry.players[0].id === playerId);
    assert.ok(participant, "the tournament has the player");

    return participant.id;
  };

  const soloParticipant = participantOf(solo.id);
  const rivalParticipant = participantOf(rival.id);

  await request("PATCH", `/tournaments/${tournament.id}`, { format: "3v3" }, staffCookie, 400);

  const playedAt = new Date(Date.now() - 3_600_000);

  const { match } = (
    await request(
      "POST",
      `/tournaments/${tournament.id}/matches`,
      {
        name: "Final",
        participantIds: [soloParticipant, rivalParticipant],
        beginAt: playedAt.toISOString(),
        status: "running",
        numberOfGames: 1,
      },
      staffCookie,
      201,
    )
  ).json(soloMatchBody);

  assert.equal(match.slug, "fake-solo-one-vs-fake-solo-two-fake-knockout");

  const scored = await RequestContext.create(
    orm.em.fork(),
    async () =>
      await app.get(MatchService).updateMatch(match.id, {
        status: "finished",
        results: [
          { participantId: soloParticipant, score: 1 },
          { participantId: rivalParticipant, score: 0 },
        ],
      }),
  );

  assert.ok(scored.winner, "the scored match has a winner");
  assert.equal(scored.winner.id, soloParticipant);

  const detail = (await request("GET", `/tournaments/${tournament.id}`)).json(
    tournamentDetailBody,
  ).tournament;

  assert.equal(detail.format, "1v1");
  assert.deepEqual(detail.matches[0].winnerId, soloParticipant);
  assert.deepEqual(
    detail.matches[0].participants.find((participant) => participant.id === soloParticipant),
    {
      id: soloParticipant,
      team: null,
      players: [{ id: solo.id, name: solo.name, slug: solo.slug }],
    },
  );

  const results = (await request("GET", `/matches/results?tournamentId=${tournament.id}`)).json(
    matchResultsBody,
  );

  assert.equal(results.results[0].participants[0].team, null);
  assert.equal(results.results[0].participants[0].players?.length, 1);

  const played = (await request("GET", `/player/${solo.id}/tournaments`)).json(
    playedTournamentsBody,
  ).tournaments;

  assert.deepEqual(
    played.map(({ id }) => id),
    [tournament.id],
  );

  const [candidate] = await new MikroOrmStatsCandidates(orm.em.fork()).matches(tournament.id);
  assert.deepEqual(candidate.participants.map(({ teamNames }) => teamNames).sort(byJoined), [
    ["Fake Solo One"],
    ["Fake Solo Two"],
  ]);

  const [assignment] = assignReplays(
    [
      {
        id: "fake-1v1-replay",
        rocketLeagueId: "RL-1v1",
        title: "Fake 1v1",
        playedAt,
        playedAtHasTimezone: true,
        blue: { name: null, goals: 0, playerNames: ["Fake Solo Two"] },
        orange: { name: null, goals: 2, playerNames: ["Fake Solo One"] },
      },
    ],
    [candidate],
  );

  assert.equal(assignment.kind, "matched");
  assert.deepEqual(assignment.sides, { blue: rivalParticipant, orange: soloParticipant });

  const stat = { platform: "epic", assists: 0, saves: 1, shots: 2, demolitions: 0 } as const;
  await new MikroOrmGameStatsStore(orm.em.fork()).save({
    matchId: match.id,
    number: 1,
    ballchasingId: "fake-1v1-replay",
    rocketLeagueId: "RL-1v1",
    playedAt,
    blueParticipantId: rivalParticipant,
    orangeParticipantId: soloParticipant,
    blueGoals: 0,
    orangeGoals: 2,
    players: [
      {
        ...stat,
        name: "Fake Solo Two",
        platformId: "fake-two",
        side: "blue",
        goals: 0,
        playerId: rival.id,
      },
      {
        ...stat,
        name: "Fake Solo One",
        platformId: "fake-one",
        side: "orange",
        goals: 2,
        playerId: solo.id,
      },
    ],
    learnedLinks: [],
  });
  const [game] = (await request("GET", `/matches/${match.id}`)).json(gameBody).games;
  assert.deepEqual(
    game.teams.map(({ participantId, players }) => [participantId, players[0].player.id]),
    [
      [rivalParticipant, rival.id],
      [soloParticipant, solo.id],
    ],
  );
  const attachment = await new MikroOrmGameStatsStore(orm.em.fork()).attachment("fake-1v1-replay");
  assert.ok(attachment, "the replay is attached");
  assert.deepEqual(attachment.teams, ["Fake Solo Two", "Fake Solo One"]);
  await assert.rejects(
    RequestContext.create(
      orm.em.fork(),
      async () => await app.get(RosterMergeService).mergePlayers(solo.id, rival.id),
    ),
    ConflictError,
    "two players of one 1v1 tournament cannot be merged into one participant",
  );
}
