import assert from "node:assert/strict";
import { z } from "zod";
import type { Orm, Request } from "./support.mts";

export interface SitemapContext {
  orm: Orm;
  request: Request;
  tournament: { id: string; slug: string; event: { slug: string } };
}

const matchBody = z.object({ match: z.object({ slug: z.string() }) });

const staffTournamentsBody = z.object({ tournaments: z.array(z.object({ id: z.string() })) });

const sitemapEntries = z.array(z.object({ path: z.string() }));

export async function verifySitemap({ orm, request, tournament }: SitemapContext): Promise<void> {
  const { Match, Tournament, TournamentParticipant } =
    await import("../../src/tournament/infrastructure/persistence/tournament.entities.ts");

  const { Contract, Player, Team } =
    await import("../../src/roster/infrastructure/persistence/player.entities.ts");

  type TournamentParticipantRow = InstanceType<typeof TournamentParticipant>;

  const em = orm.em.fork();
  const stage = await em.findOneOrFail(Tournament, { id: tournament.id });

  const addMatch = (name: string, status: string, participants: TournamentParticipantRow[]) => {
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

  assert.ok(participants.length >= 2, "the stage has two teams to play a listed match");
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
  const coach = new Player();
  Object.assign(coach, { name: "Sitemap Coach", slug: "sitemap-coach" });
  const coaching = new Contract();
  Object.assign(coaching, {
    player: coach,
    team: participants[0].team,
    startDate: new Date("2000-01-01"),
    endDate: null,
    role: "coach",
  });
  em.persist([coach, coaching]);
  const stageBeginAt = stage.beginAt;
  stage.beginAt = new Date("2026-01-10T12:00:00Z");
  await em.flush();

  const paths = async (kind: string): Promise<string[]> =>
    (await request("GET", `/sitemap/${kind}`)).json(sitemapEntries).map(({ path }) => path);

  const stages = await paths("tournaments");
  assert.ok(stages.includes(`/tournaments/${tournament.event.slug}`));
  assert.ok(stages.includes(`/tournaments/${tournament.event.slug}/${tournament.slug}`));

  const matches = await paths("matches");
  const publicIds = new Set(matches.map((path) => Number(path.split("/")[2])));
  assert(publicIds.has(listed.publicId));

  for (const excluded of [noTeams, oneTeam, tbd, canceled]) {
    assert(!publicIds.has(excluded.publicId), `${excluded.name} stays out of the sitemap`);
  }

  const { match } = (await request("GET", `/matches/${listed.publicId}`)).json(matchBody);
  assert.ok(matches.includes(`/matches/${listed.publicId}/${match.slug}`), "the slug is canonical");

  const players = await paths("players");
  assert.ok(!players.includes("/player/sitemap-empty-player"));
  const mergedPlayers = await em.find(Player, { mergedInto: { $ne: null } });
  assert.ok(mergedPlayers.length > 0, "the scenario runs after a player merge");

  for (const { slug } of mergedPlayers) assert.ok(!players.includes(`/player/${slug}`));

  const staff = await paths("staff");
  assert.ok(staff.includes("/staff/sitemap-coach"));
  assert.ok(!staff.includes("/staff/sitemap-empty-player"));

  const { tournaments: coached } = (
    await request("GET", `/player/${coach.id}/staff-tournaments`)
  ).json(staffTournamentsBody);

  assert.ok(
    coached.some(({ id }) => id === stage.id),
    "a staff tenure covers its team's stage",
  );

  const teams = await paths("teams");
  const firstTeam = participants[0].team;
  assert.ok(firstTeam, "the participant has a team");
  const teamSlug = firstTeam.slug;
  assert.ok(teams.includes(`/team/${teamSlug}`));
  const mergedTeams = await em.find(Team, { mergedInto: { $ne: null } });
  assert.ok(mergedTeams.length > 0, "the scenario runs after a team merge");

  for (const { slug } of mergedTeams) assert.ok(!teams.includes(`/team/${slug}`));

  await request("GET", "/sitemap/bogus", undefined, undefined, 404);

  em.remove([
    listed,
    noTeams,
    oneTeam,
    tbd,
    canceled,
    tbdParticipant,
    tbdTeam,
    emptyPlayer,
    coaching,
    coach,
  ]);
  stage.beginAt = stageBeginAt;
  await em.flush();
}
