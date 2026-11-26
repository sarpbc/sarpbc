import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { forumPostPath, forumPostSlug } from "@sarpbc/utils";
import { z } from "zod";
import type { Orm, Request } from "./support.mts";

export interface SitemapContext {
  orm: Orm;
  request: Request;
  tournament: { id: string; slug: string; event: { slug: string } };
}

const matchBody = z.object({ match: z.object({ slug: z.string() }) });

const staffTournamentsBody = z.object({ tournaments: z.array(z.object({ id: z.string() })) });

const sitemapEntries = z.array(z.object({ lastmod: z.string().nullable(), path: z.string() }));

export const verifySitemap = async ({ orm, request, tournament }: SitemapContext) => {
  const { Match } = await import("../../src/tournament/infrastructure/persistence/match.entity.ts");

  const { Tournament } =
    await import("../../src/tournament/infrastructure/persistence/tournament.entity.ts");

  const { TournamentParticipant } =
    await import("../../src/tournament/infrastructure/persistence/tournament-participant.entity.ts");

  const { Contract } =
    await import("../../src/roster/infrastructure/persistence/contract.entity.ts");

  const { Player } = await import("../../src/roster/infrastructure/persistence/player.entity.ts");
  const { Team } = await import("../../src/roster/infrastructure/persistence/team.entity.ts");

  const { Circuit } =
    await import("../../src/circuit/infrastructure/persistence/circuit.entity.ts");

  const { Season } = await import("../../src/season/infrastructure/persistence/season.entity.ts");
  const { Post } = await import("../../src/forum/infrastructure/persistence/post.entity.ts");
  const { Topic } = await import("../../src/forum/infrastructure/persistence/topic.entity.ts");
  const { User } = await import("../../src/user/infrastructure/persistence/user.entity.ts");

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
  Object.assign(tbdParticipant, { team: tbdTeam, tournament: stage });
  em.persist(tbdParticipant);
  const listed = addMatch("Sitemap Listed", "not_started", participants.slice(0, 2));
  const noTeams = addMatch("Sitemap No Teams", "not_started", []);
  const oneTeam = addMatch("Sitemap One Team", "not_started", participants.slice(0, 1));
  const tbd = addMatch("Sitemap TBD", "not_started", [participants[0], tbdParticipant]);
  const canceled = addMatch("Sitemap Canceled", "canceled", participants.slice(0, 2));
  const finished = addMatch("Sitemap Finished", "finished", participants.slice(0, 2));
  const finishedEndAt = new Date("2021-03-14T20:00:00.000Z");
  finished.endAt = finishedEndAt;
  const emptyPlayer = new Player();
  Object.assign(emptyPlayer, { name: "Sitemap Empty Player", slug: "sitemap-empty-player" });
  em.persist(emptyPlayer);
  const coach = new Player();
  Object.assign(coach, { name: "Sitemap Coach", nationality: " zz ", slug: "sitemap-coach" });
  const coaching = new Contract();
  Object.assign(coaching, {
    endDate: null,
    player: coach,
    role: "coach",
    startDate: new Date("2000-01-01"),
    team: participants[0].team,
  });
  em.persist([coach, coaching]);
  const circuit = new Circuit();
  Object.assign(circuit, { name: "Sitemap Circuit", slug: "sitemap-circuit" });
  const archived = new Season();
  Object.assign(archived, { name: "Sitemap Season", slug: "sitemap-season" });
  const unpublished = new Season();
  Object.assign(unpublished, { name: "Sitemap Unpublished Season", slug: null });
  const [author] = await em.getRepository(User).findAll({ limit: 1 });
  const [topic] = await em.getRepository(Topic).findAll({ limit: 1 });
  const post = new Post();
  Object.assign(post, {
    author,
    content: "Sitemap post",
    id: randomUUID(),
    title: "Sitemap Forum Post",
    topic,
  });
  em.persist([circuit, archived, unpublished, post]);
  const stageBeginAt = stage.beginAt;
  stage.beginAt = new Date("2026-01-10T12:00:00Z");
  await em.flush();

  const entries = async (kind: string) => {
    const response = await request("GET", `/sitemap/${kind}`);

    return response.json(sitemapEntries);
  };

  const paths = async (kind: string) => {
    const list = await entries(kind);

    return list.map(({ path }) => path);
  };

  const stages = await paths("tournaments");
  assert.ok(stages.includes(`/tournaments/${tournament.event.slug}`));
  assert.ok(stages.includes(`/tournaments/${tournament.event.slug}/${tournament.slug}`));

  const matchEntries = await entries("matches");
  const matches = matchEntries.map(({ path }) => path);
  const publicIds = new Set(matches.map((path) => Number(path.split("/")[2])));
  assert.ok(publicIds.has(listed.publicId));

  for (const excluded of [noTeams, oneTeam, tbd, canceled]) {
    assert.ok(!publicIds.has(excluded.publicId), `${excluded.name} stays out of the sitemap`);
  }

  const finishedEntry = matchEntries.find(({ path }) =>
    path.startsWith(`/matches/${finished.publicId}/`),
  );

  assert.equal(
    finishedEntry?.lastmod,
    finishedEndAt.toISOString(),
    "a finished match is dated by its end",
  );

  const response2 = await request("GET", `/matches/${listed.publicId}`);
  const { match } = response2.json(matchBody);
  assert.ok(matches.includes(`/matches/${listed.publicId}/${match.slug}`), "the slug is canonical");

  const players = await paths("players");
  assert.ok(!players.includes("/player/sitemap-empty-player"));
  const mergedPlayers = await em.getRepository(Player).find({ mergedInto: { $ne: null } });
  assert.ok(mergedPlayers.length > 0, "the scenario runs after a player merge");

  for (const { slug } of mergedPlayers) {
    assert.ok(!players.includes(`/player/${slug}`));
  }

  const staff = await paths("staff");
  assert.ok(staff.includes("/staff/sitemap-coach"));
  assert.ok(!staff.includes("/staff/sitemap-empty-player"));

  const response3 = await request("GET", `/player/${coach.id}/staff-tournaments`);
  const { tournaments: coached } = response3.json(staffTournamentsBody);

  assert.ok(
    coached.some(({ id }) => id === stage.id),
    "a staff tenure covers its team's stage",
  );

  const teams = await paths("teams");
  const firstTeam = participants[0].team;
  assert.ok(firstTeam, "the participant has a team");
  const teamSlug = firstTeam.slug;
  assert.ok(teams.includes(`/team/${teamSlug}`));
  const mergedTeams = await em.getRepository(Team).find({ mergedInto: { $ne: null } });
  assert.ok(mergedTeams.length > 0, "the scenario runs after a team merge");

  for (const { slug } of mergedTeams) {
    assert.ok(!teams.includes(`/team/${slug}`));
  }

  const circuits = await paths("circuits");
  assert.ok(circuits.includes("/circuits/sitemap-circuit"));
  const seasons = await paths("seasons");
  assert.ok(seasons.includes("/seasons/sitemap-season"));
  assert.ok(seasons.every((path) => path !== "/seasons/" && path !== "/seasons/null"));
  const countries = await paths("countries");
  assert.ok(countries.includes("/countries/zz"), "a padded lowercase nationality is normalized");
  const posts = await em.getRepository(Post).findAll();
  assert.ok(posts.includes(post));
  const forum = await paths("forum");

  assert.deepEqual(
    forum.toSorted(),
    posts.map(({ publicId, title }) => forumPostPath(publicId, forumPostSlug(title))).toSorted(),
  );

  await request("GET", "/sitemap/bogus", undefined, undefined, 404);

  em.remove([
    listed,
    noTeams,
    oneTeam,
    tbd,
    canceled,
    finished,
    tbdParticipant,
    tbdTeam,
    emptyPlayer,
    coaching,
    coach,
    circuit,
    archived,
    unpublished,
    post,
  ]);
  stage.beginAt = stageBeginAt;
  await em.flush();
};
