import assert from "node:assert/strict";

export async function verifySitemap({ orm, request, tournament }) {
  const { Match, Tournament, TournamentParticipant } =
    await import("../../src/tournament/infrastructure/persistence/tournament.entities.ts");
  const { Player, Team } =
    await import("../../src/roster/infrastructure/persistence/player.entities.ts");

  const em = orm.em.fork();
  const stage = await em.findOneOrFail(Tournament, { id: tournament.id });
  const addMatch = (name, status, participants) => {
    const match = new Match();
    Object.assign(match, { name, status, tournament: stage });
    match.participants.set(participants);
    em.persist(match);
    return match;
  };
  const participants = await em.find(
    TournamentParticipant,
    { tournament: stage },
    { populate: ["team"] },
  );
  assert(participants.length >= 2, "the stage has two teams to play a listed match");
  const tbdTeam = new Team();
  Object.assign(tbdTeam, { name: " tbd ", slug: "sitemap-tbd-team" });
  em.persist(tbdTeam);
  const tbdParticipant = new TournamentParticipant();
  Object.assign(tbdParticipant, { tournament: stage, team: tbdTeam });
  em.persist(tbdParticipant);
  const listed = addMatch("Sitemap Listed", "not_started", participants.slice(0, 2));
  const noTeams = addMatch("Sitemap No Teams", "not_started", []);
  const oneTeam = addMatch("Sitemap One Team", "not_started", participants.slice(0, 1));
  const tbd = addMatch("Sitemap TBD", "not_started", [participants[0], tbdParticipant]);
  const canceled = addMatch("Sitemap Canceled", "canceled", participants.slice(0, 2));
  const emptyPlayer = new Player();
  Object.assign(emptyPlayer, { name: "Sitemap Empty Player", slug: "sitemap-empty-player" });
  em.persist(emptyPlayer);
  await em.flush();

  const paths = async (kind) =>
    (await request("GET", `/sitemap/${kind}`)).json().map(({ path }) => path);

  const stages = await paths("tournaments");
  assert(stages.includes(`/tournaments/${tournament.event.slug}`));
  assert(stages.includes(`/tournaments/${tournament.event.slug}/${tournament.slug}`));

  const matches = await paths("matches");
  const publicIds = matches.map((path) => Number(path.split("/")[2]));
  assert(publicIds.includes(listed.publicId));
  for (const excluded of [noTeams, oneTeam, tbd, canceled]) {
    assert(!publicIds.includes(excluded.publicId), `${excluded.name} stays out of the sitemap`);
  }
  const { match } = (await request("GET", `/matches/${listed.publicId}`)).json();
  assert(matches.includes(`/matches/${listed.publicId}/${match.slug}`), "the slug is canonical");

  const players = await paths("players");
  assert(!players.includes("/player/sitemap-empty-player"));
  const mergedPlayers = await em.find(Player, { mergedInto: { $ne: null } });
  assert(mergedPlayers.length > 0, "the scenario runs after a player merge");
  for (const { slug } of mergedPlayers) assert(!players.includes(`/player/${slug}`));

  const teams = await paths("teams");
  const teamSlug = participants[0].team.slug;
  assert(teams.includes(`/team/${teamSlug}`));
  const mergedTeams = await em.find(Team, { mergedInto: { $ne: null } });
  assert(mergedTeams.length > 0, "the scenario runs after a team merge");
  for (const { slug } of mergedTeams) assert(!teams.includes(`/team/${slug}`));

  await request("GET", "/sitemap/bogus", undefined, undefined, 404);

  em.remove([listed, noTeams, oneTeam, tbd, canceled, tbdParticipant, tbdTeam, emptyPlayer]);
  await em.flush();
}
