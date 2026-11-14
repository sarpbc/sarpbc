import assert from "node:assert/strict";
import { z } from "zod";
import { toolFailure } from "./support.mts";
import type { CallTool, Request, Review } from "./support.mts";

const ANNOUNCEMENT = "https://example.test/fake-league/awards";

export interface SeasonAwardsContext {
  request: Request;
  staffCookie: string;
  memberCookie: string;
  callTool: CallTool;
  review: Review;
  player: { id: string };
}

export interface SeasonArchivesContext {
  request: Request;
  staffCookie: string;
  memberCookie: string;
  team: { id: string };
  otherTeam: { id: string };
  tournament: { id: string; source: string };
  startggCupId: string;
}

const idRef = z.object({ id: z.string() });

const playerBody = z.object({ player: idRef });

const createdSeason = z.object({ id: z.string(), slug: z.string().nullable() });

const seasonList = z.object({ seasons: z.array(idRef) });

const seasonAwardBody = z.object({
  award: z.object({ id: z.string(), presentedBy: z.string().nullable() }),
});

const seasonDetail = z.object({
  awards: z.array(
    z.object({ awardType: z.string(), region: z.string().nullable(), player: idRef }),
  ),
  participants: z.array(
    z.object({
      id: z.string(),
      path: z.array(z.object({ tournament: z.object({ source: z.string() }).nullish() })),
    }),
  ),
});

const playerSeasonAwards = z.object({
  seasonAwards: z.array(
    z.object({
      awardType: z.string(),
      region: z.string().nullable(),
      season: z.object({ name: z.string() }),
    }),
  ),
});

const seasonArchive = z.object({
  winner: idRef.nullable(),
  format: z.object({ phases: z.array(z.unknown()) }),
  participants: z.array(z.object({ team: idRef, path: z.array(z.object({ label: z.string() })) })),
});

const seasonArchiveList = z.object({
  seasons: z.array(z.object({ slug: z.string().nullable(), winner: idRef.nullish() })),
});

export async function verifySeasonAwards({
  request,
  staffCookie,
  memberCookie,
  callTool,
  review,
  player,
}: SeasonAwardsContext): Promise<void> {
  const otherPlayer = (
    await request("POST", "/player", { name: "Season Award Rival" }, staffCookie, 201)
  ).json(playerBody).player;

  await request("POST", "/seasons", { name: "Fake League 2026" }, memberCookie, 403);

  const season = (
    await request("POST", "/seasons", { name: "Fake League 2026" }, staffCookie, 201)
  ).json(createdSeason);

  await request("POST", "/seasons", { name: "Fake League 2026" }, staffCookie, 409);
  await request("GET", "/seasons", undefined, undefined, 401);
  assert.ok(
    (await request("GET", "/seasons", undefined, staffCookie))
      .json(seasonList)
      .seasons.some(({ id }) => id === season.id),
  );

  const awardsUrl = `/seasons/${season.id}/awards`;

  const seasonMvp = {
    playerId: player.id,
    awardType: "season_mvp",
    presentedBy: "Fake Partner",
    sourceUrl: ANNOUNCEMENT,
  };

  await request("POST", awardsUrl, seasonMvp, memberCookie, 403);
  await request(
    "POST",
    awardsUrl,
    { ...seasonMvp, sourceUrl: "https://liquipedia.net/rocketleague/Fake_League" },
    staffCookie,
    400,
  );
  await request("POST", awardsUrl, { ...seasonMvp, region: "Europe" }, staffCookie, 400);
  await request(
    "POST",
    awardsUrl,
    { ...seasonMvp, awardType: "regional_mvp", presentedBy: null },
    staffCookie,
    400,
  );

  const mvp = (await request("POST", awardsUrl, seasonMvp, staffCookie, 201)).json(
    seasonAwardBody,
  ).award;

  assert.equal(mvp.presentedBy, "Fake Partner");
  await request("POST", awardsUrl, { ...seasonMvp, playerId: otherPlayer.id }, staffCookie, 409);

  const regional = (region: string, playerId: string) => ({
    seasonId: season.id,
    playerId,
    awardType: "regional_mvp",
    region,
    sourceUrl: ANNOUNCEMENT,
  });

  assert.deepEqual(
    await callTool(
      "propose_season_award",
      { ...regional("Europe", player.id), sourceUrl: "" },
      toolFailure,
    ),
    { error: true },
    "propose_season_award requires a sourceUrl",
  );
  assert.deepEqual(
    await callTool(
      "propose_season_award",
      {
        ...regional("Europe", player.id),
        sourceUrl: "https://liquipedia.net/rocketleague/Fake_League",
      },
      toolFailure,
    ),
    { error: true },
    "Liquipedia is refused through the MCP",
  );
  const europe = await callTool("propose_season_award", regional("Europe", player.id));
  assert.equal(europe.status, "pending");
  assert.equal((await review(europe)).status, "applied");

  const northAmerica = await callTool(
    "propose_season_award",
    regional("North America", otherPlayer.id),
  );

  assert.equal((await review(northAmerica)).status, "applied");
  assert.deepEqual(
    await callTool("propose_season_award", regional("Europe", otherPlayer.id), toolFailure),
    { error: true },
    "a region holds one Regional MVP",
  );

  const detail = await callTool(
    "get_season",
    { id: season.id },
    seasonDetail.pick({ awards: true }),
  );

  assert.deepEqual(
    detail.awards.map(({ awardType, region, player: { id } }) => [awardType, region, id]),
    [
      ["season_mvp", null, player.id],
      ["regional_mvp", "Europe", player.id],
      ["regional_mvp", "North America", otherPlayer.id],
    ],
  );
  assert.ok(
    (await callTool("list_seasons", {}, z.array(idRef))).some(({ id }) => id === season.id),
  );

  const profile = (await request("GET", `/player/${player.id}/awards`)).json(playerSeasonAwards);

  assert.deepEqual(
    profile.seasonAwards.map(({ awardType, region, season: { name } }) => [
      awardType,
      region,
      name,
    ]),
    [
      ["season_mvp", null, "Fake League 2026"],
      ["regional_mvp", "Europe", "Fake League 2026"],
    ],
  );

  await request("DELETE", `${awardsUrl}/${mvp.id}`, undefined, staffCookie, 204);
  await request("DELETE", `${awardsUrl}/${mvp.id}`, undefined, staffCookie, 404);
  await request("DELETE", `/seasons/${season.id}`, undefined, staffCookie, 204);
  assert.deepEqual(
    (await request("GET", `/player/${player.id}/awards`)).json(playerSeasonAwards).seasonAwards,
    [],
  );
}

export async function verifySeasonArchives({
  request,
  staffCookie,
  memberCookie,
  team,
  otherTeam,
  tournament,
  startggCupId,
}: SeasonArchivesContext): Promise<void> {
  const slug = "fake-archive-2026";
  await request("POST", "/seasons", { name: "Fake Archive 2026", slug }, memberCookie, 403);

  const season = (
    await request("POST", "/seasons", { name: "Fake Archive 2026", slug }, staffCookie, 201)
  ).json(createdSeason);

  assert.equal(season.slug, slug);
  await request("POST", "/seasons", { name: "Fake Archive copy", slug }, staffCookie, 409);
  await request("GET", "/season-archives/fake-archive-unknown", undefined, undefined, 404);
  assert.deepEqual((await request("GET", `/season-archives/${slug}`)).json(z.unknown()), {
    slug,
    name: "Fake Archive 2026",
    format: { summary: null, phases: [] },
    winner: null,
    participants: [],
    awards: [],
  });

  const participantsUrl = `/seasons/${season.id}/participants`;
  await request("POST", participantsUrl, { teamId: team.id }, memberCookie, 403);

  const winner = (
    await request(
      "POST",
      participantsUrl,
      { teamId: team.id, pathNote: "Fake path." },
      staffCookie,
      201,
    )
  ).json(z.object({ participant: idRef })).participant;

  await request("POST", participantsUrl, { teamId: team.id }, staffCookie, 409);
  await request("POST", participantsUrl, { teamId: otherTeam.id }, staffCookie, 201);

  const pathUrl = `${participantsUrl}/${winner.id}/path`;

  for (const entry of [
    { label: "Fake Open", result: "Qualified", tournamentId: startggCupId },
    { label: "Fake Major", result: "1st", tournamentId: tournament.id },
    { label: "Fake Regional", result: "Top 4" },
  ])
    await request("POST", pathUrl, entry, staffCookie, 201);

  await request(
    "PATCH",
    `/seasons/${season.id}`,
    {
      name: "Fake Archive 2026",
      winnerTeamId: team.id,
      format: { summary: "Fake format.", phases: [{ name: "Fake splits", description: null }] },
    },
    staffCookie,
    200,
  );
  await request("DELETE", `${participantsUrl}/${winner.id}`, undefined, staffCookie, 409);

  const detail = (await request("GET", `/seasons/${season.id}`, undefined, staffCookie)).json(
    seasonDetail,
  );

  const staffEntry = detail.participants.find(({ id }) => id === winner.id);
  assert.ok(staffEntry, "the season lists the winner");
  const staffPath = staffEntry.path;
  assert.deepEqual(
    staffPath.map(({ tournament: linked }) => linked?.source ?? null),
    ["startgg", tournament.source, null],
  );

  const archiveBody = (await request("GET", `/season-archives/${slug}`)).json(z.json());
  const archive = seasonArchive.parse(archiveBody);
  assert.ok(archive.winner, "the archive names the winner");
  assert.equal(archive.winner.id, team.id);
  assert.deepEqual(archive.format.phases, [{ name: "Fake splits", description: null }]);
  const publicEntry = archive.participants.find(({ team: { id } }) => id === team.id);
  assert.ok(publicEntry, "the archive lists the winner");
  const publicPath = publicEntry.path;
  assert.deepEqual(
    publicPath.map(({ label }) => label),
    ["Fake Major", "Fake Regional"],
  );
  assert.ok(!JSON.stringify(archiveBody).includes(startggCupId));
  assert.ok(
    (await request("GET", "/season-archives"))
      .json(seasonArchiveList)
      .seasons.some((summary) => summary.slug === slug && summary.winner?.id === team.id),
  );

  await request("DELETE", `/seasons/${season.id}`, undefined, staffCookie, 204);
  await request("GET", `/season-archives/${slug}`, undefined, undefined, 404);
}
