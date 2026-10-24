import assert from "node:assert/strict";

export async function verifyCompetitionImport({ app, orm, request, staffCookie, RequestContext }) {
  const { CompetitionSyncService } =
    await import("../../src/tournament/application/sync/competition-sync.service.ts");
  const { Player } = await import("../../src/roster/infrastructure/persistence/player.entities.ts");
  const sync = app.get(CompetitionSyncService);
  const run = (work) => RequestContext.create(orm.em.fork(), work);
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

  await run(() =>
    sync.applyIncident({
      id: 1,
      modifiedAt: new Date(),
      changeType: "creation",
      kind: "player",
      command: { player: veteran, currentTeam },
    }),
  );
  const player = await orm.em
    .fork()
    .findOneOrFail(Player, { pandascoreId: veteran.pandascoreId }, { populate: ["team"] });
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
    beginAt: new Date(Date.now() - 172800000),
    endAt: new Date(Date.now() + 172800000),
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
    beginAt: new Date(Date.now() - 7200000),
    endAt: new Date(Date.now() - 3600000),
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
    beginAt: new Date(Date.now() + 86400000),
    endAt: undefined,
    status: "not_started",
    results: [],
    previousMatches: [{ type: "winner", matchPandascoreId: semifinal.pandascoreId }],
    officialStreams: [{ url: "https://twitch.tv/example", language: "en", main: true }],
  };
  const imported = await run(() => sync.upsertTournament(tournamentCommand, [final, semifinal]));
  let view = (await request("GET", `/tournaments/${imported.id}`)).json().tournament;
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
  assert(participant, "the historical team remains a tournament participant");
  assert.equal(participant.players[0].id, player.id);
  assert.equal(view.winner.id, participant.id);
  const semiView = view.matches.find((m) => m.name === semifinal.name);
  const finalView = view.matches.find((m) => m.name === final.name);
  assert.equal(semiView.winnerId, participant.id);
  assert.equal(finalView.previousMatches[0].previousMatch, semiView.id);
  assert.equal((await request("GET", `/player/${player.id}`)).json().player.team.id, currentTeamId);

  await request(
    "PATCH",
    `/tournaments/${imported.id}`,
    { imageUrl: "https://example.test/local-cup.png" },
    staffCookie,
  );
  await run(() =>
    sync.upsertTournament(
      {
        ...tournamentCommand,
        name: "Imported Championship Updated",
        serie: { ...tournamentCommand.serie, fullName: "Spring Major" },
      },
      [semifinal, final],
    ),
  );
  view = (await request("GET", `/tournaments/${imported.id}`)).json().tournament;
  assert.equal(view.name, "Imported Championship Updated");
  assert.equal(view.slug, "imported-championship");
  assert.deepEqual(
    { slug: view.event.slug, name: view.event.name },
    { slug: "imported-league-spring-split-2026", name: "Imported League Spring Major" },
  );
  const eventPath = `/events/resolve/${view.event.slug}`;
  assert.equal((await request("GET", eventPath)).json().event.stages[0].id, imported.id);
  assert.equal(
    (await request("GET", `${eventPath}/imported-championship`)).json().tournament.id,
    imported.id,
  );
  assert.equal(view.imageUrl, "https://example.test/local-cup.png");
  assert.equal(view.participants.length, 2);
  assert.equal(view.matches.length, 2);
  assert.equal(view.matches.find((m) => m.id === semiView.id).results.length, 2);
  assert.equal(view.matches.find((m) => m.id === finalView.id).previousMatches.length, 1);
  const refreshedPlayer = (await request("GET", `/player/${player.id}`)).json().player;
  assert.equal(refreshedPlayer.slug, "local-veteran");
  assert.equal(refreshedPlayer.team.id, currentTeamId);

  const finalDetail = (await request("GET", `/matches/${finalView.id}`)).json();
  assert.equal(finalDetail.match.officialStreams[0].language, "en");
  assert.equal(finalDetail.headToHead.totalMeetings, 1);
  assert.equal(finalDetail.teamForms[participant.team.id].record.wins, 1);
  assert.equal(
    (await request("GET", `/matches/results?tournamentId=${imported.id}`)).json().total,
    1,
  );
  assert.equal(
    (await request("GET", `/matches/upcoming?leagueId=${view.league.id}`)).json().total,
    1,
  );
  assert(
    (await request("GET", `/player/${player.id}/trophies`))
      .json()
      .trophies.some((t) => t.id === imported.id),
  );
  assert(
    (await request("GET", `/team/${participant.team.id}/tournaments`))
      .json()
      .tournaments.some((t) => t.id === imported.id),
  );
  assert(
    (await request("GET", `/team/${participant.team.id}/trophies`))
      .json()
      .trophies.some((t) => t.id === imported.id),
  );
  assert((await request("GET", `/player/${player.id}/matches`)).json().matches.length >= 2);
  assert.equal(
    (await run(() => sync.findTournamentByPandascoreId(tournamentCommand.pandascoreId))).id,
    imported.id,
  );
  assert(
    (await run(() => sync.getKnownTournamentPandascoreIds())).has(tournamentCommand.pandascoreId),
  );
  await run(() =>
    sync.applyIncident({
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
    }),
  );
  const updatedSemifinal = (await request("GET", `/matches/${semiView.id}`)).json().match;
  assert.equal(updatedSemifinal.id, semiView.id);
  assert.equal(updatedSemifinal.winner.id, participant.id);
  assert.equal(updatedSemifinal.results.length, 2);
  assert.equal(
    updatedSemifinal.results.find((result) => result.participant.id !== participant.id).score,
    2,
  );

  await run(() =>
    sync.applyIncident({
      id: 2,
      modifiedAt: new Date(),
      changeType: "update",
      kind: "player",
      command: { player: veteran, currentTeam: null },
    }),
  );
  assert.equal((await request("GET", `/player/${player.id}`)).json().player.team, null);
  assert.equal(
    (await request("GET", `/tournaments/${imported.id}`))
      .json()
      .tournament.participants.find((p) => p.id === participant.id).players[0].id,
    player.id,
  );

  const qualifier = await run(() =>
    sync.upsertTournament({
      pandascoreId: 9302,
      name: "Imported Championship Updated",
      league: tournamentCommand.league,
      serie: { pandascoreId: 9602, fullName: "Spring Qualifier", year: 2026 },
    }),
  );
  assert.equal(qualifier.event.slug, "imported-league-spring-qualifier-2026");
  await run(() =>
    sync.applyIncident({
      id: 9602,
      modifiedAt: new Date(),
      changeType: "deletion",
      kind: "serie",
      deletion: { kind: "merged", intoId: tournamentCommand.serie.pandascoreId },
    }),
  );
  const merged = (await request("GET", `/tournaments/${qualifier.id}`)).json().tournament;
  assert.deepEqual(
    [merged.event.slug, merged.slug],
    ["imported-league-spring-split-2026", "imported-championship-updated"],
  );
  await request("GET", `/events/resolve/${qualifier.event.slug}`, undefined, undefined, 404);
  assert.deepEqual(
    (await request("GET", `/events/resolve/${merged.event.slug}`))
      .json()
      .event.stages.map((stage) => stage.id)
      .sort(),
    [imported.id, qualifier.id].sort(),
  );
  return { tournamentId: imported.id, participantId: participant.id, playerId: player.id };
}
