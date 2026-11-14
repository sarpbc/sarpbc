import assert from "node:assert/strict";
import { z } from "zod";
import type { TournamentQueries } from "../../src/tournament/application/ports.ts";
import type { Application, Orm, Request, RequestContextType } from "./support.mts";

const idRow = z.looseObject({ id: z.string() });

const participantView = z.object({
  id: z.string(),
  team: z.looseObject({ id: z.string(), slug: z.string() }),
  players: z.array(idRow),
});

const matchView = z.looseObject({
  id: z.string(),
  name: z.string(),
  winnerId: z.string().nullable(),
  results: z.array(z.looseObject({ participant: z.string(), score: z.number() })),
  previousMatches: z.array(z.looseObject({ previousMatch: z.string() })),
});

const tournamentRecord = z.looseObject({
  source: z.string(),
  slug: z.string(),
  name: z.string(),
  country: z.string().nullable(),
  imageUrl: z.string().nullable(),
  event: z.looseObject({ slug: z.string(), name: z.string() }),
  league: idRow,
  winner: idRow.nullable(),
  participants: z.array(participantView),
  matches: z.array(matchView),
});

const playerRecord = z.looseObject({
  slug: z.string(),
  team: idRow.nullable(),
});

const eventView = z.object({ event: z.looseObject({ stages: z.array(idRow) }) });

const matchDetail = z.object({
  match: z.looseObject({
    id: z.string(),
    winner: idRow.nullable(),
    officialStreams: z.array(z.looseObject({ language: z.string() })),
    results: z.array(z.looseObject({ participant: idRow, score: z.number() })),
  }),
  headToHead: z.looseObject({ totalMeetings: z.number() }),
  teamForms: z.record(z.string(), z.looseObject({ record: z.looseObject({ wins: z.number() }) })),
});

type TournamentView = z.infer<typeof tournamentRecord>;

type PlayerView = z.infer<typeof playerRecord>;

export interface CompetitionImportContext {
  app: Application;
  orm: Orm;
  request: Request;
  staffCookie: string;
  RequestContext: RequestContextType;
}

export interface CompetitionImportResult {
  tournamentId: string;
  participantId: string;
  playerId: string;
  matchId: string;
  rivalParticipantId: string;
}

export async function verifyCompetitionImport({
  app,
  orm,
  request,
  staffCookie,
  RequestContext,
}: CompetitionImportContext): Promise<CompetitionImportResult> {
  const { CompetitionSyncService } =
    await import("../../src/tournament/application/sync/competition-sync.service.ts");

  const { Player } = await import("../../src/roster/infrastructure/persistence/player.entities.ts");

  const { TOURNAMENT_QUERIES } =
    await import("../../src/tournament/infrastructure/competition-queries.tokens.ts");

  const sync = app.get(CompetitionSyncService);
  const tournaments = app.get<symbol, TournamentQueries>(TOURNAMENT_QUERIES);

  function run<T>(work: () => T): T {
    return RequestContext.create(orm.em.fork(), work);
  }

  const veteran = {
    pandascoreId: 9101,
    name: "Imported Veteran",
    slug: "imported-veteran",
    nationality: "FR",
  };

  const rookie = {
    pandascoreId: 9102,
    name: "Imported Rookie",
    slug: "imported-rookie",
    nationality: "BR",
  };

  const currentTeam = { pandascoreId: 9201, name: "Current Roster", slug: "current-roster" };
  const oldTeam = { pandascoreId: 9202, name: "Historical Roster", slug: "historical-roster" };
  const rival = { pandascoreId: 9203, name: "Historical Rival", slug: "historical-rival" };

  await run(async () => {
    await sync.applyIncident({
      id: 1,
      modifiedAt: new Date(),
      changeType: "creation",
      kind: "player",
      command: { player: veteran, currentTeam },
    });
  });

  const player = await orm.em
    .fork()
    .findOneOrFail(Player, { pandascoreId: veteran.pandascoreId }, { populate: ["team"] });

  assert.ok(player.team, "the imported player has a current team");
  const currentTeamId = player.team.id;
  await request(
    "PATCH",
    `/player/${player.id}`,
    { slug: "local-veteran", firstName: "Local" },
    staffCookie,
  );

  const tournamentCommand = {
    pandascoreId: 9301,
    name: "Imported Championship",
    serie: { pandascoreId: 9601, fullName: "Spring Split", year: 2026 },
    country: "FR",
    hasBracket: true,
    beginAt: new Date(Date.now() - 172_800_000),
    endAt: new Date(Date.now() + 172_800_000),
    winnerPandascoreTeamId: oldTeam.pandascoreId,
    league: {
      pandascoreId: 9401,
      name: "Imported League",
      slug: "imported-league",
      url: "https://example.test/league",
    },
    expectedRoster: [
      { team: oldTeam, players: [veteran] },
      { team: rival, players: [rookie] },
    ],
  };

  const semifinal = {
    pandascoreId: 9501,
    tournamentPandascoreId: tournamentCommand.pandascoreId,
    name: "Imported Semifinal",
    slug: "imported-semifinal",
    beginAt: new Date(Date.now() - 7_200_000),
    endAt: new Date(Date.now() - 3_600_000),
    status: "finished",
    numberOfGames: 5,
    opponentSlugs: [oldTeam.slug, rival.slug],
    opponentPandascoreIds: [oldTeam.pandascoreId, rival.pandascoreId],
    results: [
      { teamPandascoreId: oldTeam.pandascoreId, score: 3 },
      { teamPandascoreId: rival.pandascoreId, score: 1 },
    ],
    previousMatches: [],
    officialStreams: [],
  };

  const final = {
    ...semifinal,
    pandascoreId: 9502,
    name: "Imported Final",
    slug: "imported-final",
    beginAt: new Date(Date.now() + 86_400_000),
    endAt: undefined,
    status: "not_started",
    results: [],
    previousMatches: [{ type: "winner" as const, matchPandascoreId: semifinal.pandascoreId }],
    officialStreams: [{ url: "https://twitch.tv/example", language: "en", main: true }],
  };

  const imported = await run(
    async () => await sync.upsertTournament(tournamentCommand, [final, semifinal]),
  );

  async function read<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    return (await request("GET", path)).json(schema);
  }

  const playerView = async (): Promise<PlayerView> =>
    (await read(`/player/${player.id}`, z.object({ player: playerRecord }))).player;

  const tournamentView = async (id: string): Promise<TournamentView> =>
    (await request("GET", `/tournaments/${id}`)).json(z.object({ tournament: tournamentRecord }))
      .tournament;

  let view = await tournamentView(imported.id);
  assert.equal(view.source, "pandascore");
  assert.equal(view.slug, "imported-championship");
  assert.deepEqual(
    { slug: view.event.slug, name: view.event.name },
    { slug: "imported-league-spring-split-2026", name: "Imported League Spring Split" },
  );
  assert.equal(view.country, "FR");
  assert.equal(view.participants.length, 2);
  assert.equal(view.matches.length, 2);
  const participant = view.participants.find((p) => p.team.slug === oldTeam.slug);
  assert.ok(participant, "the historical team remains a tournament participant");
  assert.equal(participant.players[0].id, player.id);
  assert.equal(view.winner?.id, participant.id);
  const semiView = view.matches.find((m) => m.name === semifinal.name);
  const finalView = view.matches.find((m) => m.name === final.name);
  assert.ok(semiView && finalView, "both imported matches are listed");
  assert.equal(semiView.winnerId, participant.id);
  assert.equal(finalView.previousMatches[0].previousMatch, semiView.id);
  assert.equal((await playerView()).team?.id, currentTeamId);

  await request(
    "PATCH",
    `/tournaments/${imported.id}`,
    { imageUrl: "https://example.test/local-cup.png" },
    staffCookie,
  );
  await run(
    async () =>
      await sync.upsertTournament(
        {
          ...tournamentCommand,
          name: "Imported Championship Updated",
          serie: { ...tournamentCommand.serie, fullName: "Spring Major" },
        },
        [semifinal, final],
      ),
  );
  view = await tournamentView(imported.id);
  assert.equal(view.name, "Imported Championship Updated");
  assert.equal(view.slug, "imported-championship");
  assert.deepEqual(
    { slug: view.event.slug, name: view.event.name },
    { slug: "imported-league-spring-split-2026", name: "Imported League Spring Major" },
  );

  const { Match, Tournament } =
    await import("../../src/tournament/infrastructure/persistence/tournament.entities.ts");

  const rowVersions = async () => {
    const em = orm.em.fork();
    const stage = await em.findOneOrFail(Tournament, { id: imported.id });
    const matches = await em.find(Match, { tournament: imported.id }, { orderBy: { id: "asc" } });

    return [stage, ...matches].map((row) => [row.id, row.updatedAt.toISOString()]);
  };

  const versionsBeforeResync = await rowVersions();
  await run(
    async () =>
      await sync.upsertTournament(
        {
          ...tournamentCommand,
          name: "Imported Championship Updated",
          serie: { ...tournamentCommand.serie, fullName: "Spring Major" },
        },
        [semifinal, final],
      ),
  );
  assert.deepEqual(
    await rowVersions(),
    versionsBeforeResync,
    "an unchanged re-sync keeps each stage and match sitemap lastmod",
  );
  const eventPath = `/events/resolve/${view.event.slug}`;
  assert.equal((await read(eventPath, eventView)).event.stages[0].id, imported.id);
  assert.equal(
    (await read(`${eventPath}/imported-championship`, z.object({ tournament: idRow }))).tournament
      .id,
    imported.id,
  );
  assert.equal(view.imageUrl, "https://example.test/local-cup.png");
  assert.equal(view.participants.length, 2);
  assert.equal(view.matches.length, 2);
  assert.equal(view.matches.find((m) => m.id === semiView.id)?.results.length, 2);
  assert.equal(view.matches.find((m) => m.id === finalView.id)?.previousMatches.length, 1);
  const refreshedPlayer = await playerView();
  assert.equal(refreshedPlayer.slug, "local-veteran");
  assert.equal(refreshedPlayer.team?.id, currentTeamId);

  const finalDetail = await read(`/matches/${finalView.id}`, matchDetail);
  assert.equal(finalDetail.match.officialStreams[0].language, "en");
  assert.equal(finalDetail.headToHead.totalMeetings, 1);
  assert.equal(finalDetail.teamForms[participant.team.id].record.wins, 1);
  assert.equal(
    (await read(`/matches/results?tournamentId=${imported.id}`, z.object({ total: z.number() })))
      .total,
    1,
  );
  assert.equal(
    (await read(`/matches/upcoming?leagueId=${view.league.id}`, z.object({ total: z.number() })))
      .total,
    1,
  );
  assert.ok(
    (
      await read(`/player/${player.id}/trophies`, z.object({ trophies: z.array(idRow) }))
    ).trophies.some((t) => t.id === imported.id),
  );
  assert.ok(
    (
      await read(
        `/team/${participant.team.id}/tournaments`,
        z.object({ tournaments: z.array(idRow) }),
      )
    ).tournaments.some((t) => t.id === imported.id),
  );
  assert.ok(
    (
      await read(`/team/${participant.team.id}/trophies`, z.object({ trophies: z.array(idRow) }))
    ).trophies.some((t) => t.id === imported.id),
  );
  assert.ok(
    (await read(`/player/${player.id}/matches`, z.object({ matches: z.array(idRow) }))).matches
      .length >= 2,
  );
  assert.equal(
    (await run(async () => await tournaments.findByPandascoreId(tournamentCommand.pandascoreId)))
      ?.id,
    imported.id,
  );
  assert.ok(
    (await run(async () => await tournaments.knownPandascoreIds())).has(
      tournamentCommand.pandascoreId,
    ),
  );
  await run(async () => {
    await sync.applyIncident({
      id: 3,
      modifiedAt: new Date(),
      changeType: "update",
      kind: "match",
      command: {
        ...semifinal,
        results: [
          { teamPandascoreId: oldTeam.pandascoreId, score: 3 },
          { teamPandascoreId: rival.pandascoreId, score: 2 },
        ],
      },
    });
  });
  const updatedSemifinal = (await read(`/matches/${semiView.id}`, matchDetail)).match;
  assert.equal(updatedSemifinal.id, semiView.id);
  assert.equal(updatedSemifinal.winner?.id, participant.id);
  assert.equal(updatedSemifinal.results.length, 2);
  assert.equal(
    updatedSemifinal.results.find((result) => result.participant.id !== participant.id)?.score,
    2,
  );

  await run(async () => {
    await sync.applyIncident({
      id: 2,
      modifiedAt: new Date(),
      changeType: "update",
      kind: "player",
      command: { player: veteran, currentTeam: null },
    });
  });
  assert.equal((await playerView()).team, null);
  assert.equal(
    (await tournamentView(imported.id)).participants.find((p) => p.id === participant.id)
      ?.players[0].id,
    player.id,
  );

  const qualifier = await run(
    async () =>
      await sync.upsertTournament({
        pandascoreId: 9302,
        name: "Imported Championship Updated",
        league: tournamentCommand.league,
        serie: { pandascoreId: 9602, fullName: "Spring Qualifier", year: 2026 },
      }),
  );

  assert.equal(qualifier.event.slug, "imported-league-spring-qualifier-2026");
  await run(async () => {
    await sync.applyIncident({
      id: 9602,
      modifiedAt: new Date(),
      changeType: "deletion",
      kind: "serie",
      deletion: { kind: "merged", intoId: tournamentCommand.serie.pandascoreId },
    });
  });
  const merged = await tournamentView(qualifier.id);
  assert.deepEqual(
    [merged.event.slug, merged.slug],
    ["imported-league-spring-split-2026", "imported-championship-updated"],
  );
  await request("GET", `/events/resolve/${qualifier.event.slug}`, undefined, undefined, 404);
  assert.deepEqual(
    (await read(`/events/resolve/${merged.event.slug}`, eventView)).event.stages
      .map((stage) => stage.id)
      .sort(),
    [imported.id, qualifier.id].sort(),
  );

  const rivalParticipant = view.participants.find((p) => p.id !== participant.id);
  assert.ok(rivalParticipant, "the rival remains a tournament participant");

  return {
    tournamentId: imported.id,
    participantId: participant.id,
    playerId: player.id,
    matchId: semiView.id,
    rivalParticipantId: rivalParticipant.id,
  };
}
