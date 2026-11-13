import assert from "node:assert/strict";

const ANNOUNCEMENT = "https://example.test/fake-league/awards";

export async function verifySeasonAwards({
  request,
  staffCookie,
  memberCookie,
  callTool,
  review,
  player,
}) {
  const otherPlayer = (
    await request("POST", "/player", { name: "Season Award Rival" }, staffCookie, 201)
  ).json().player;
  await request("POST", "/seasons", { name: "Fake League 2026" }, memberCookie, 403);
  const season = (
    await request("POST", "/seasons", { name: "Fake League 2026" }, staffCookie, 201)
  ).json();
  await request("POST", "/seasons", { name: "Fake League 2026" }, staffCookie, 409);
  await request("GET", "/seasons", undefined, undefined, 401);
  assert(
    (await request("GET", "/seasons", undefined, staffCookie))
      .json()
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
  const mvp = (await request("POST", awardsUrl, seasonMvp, staffCookie, 201)).json().award;
  assert.equal(mvp.presentedBy, "Fake Partner");
  await request("POST", awardsUrl, { ...seasonMvp, playerId: otherPlayer.id }, staffCookie, 409);

  const regional = (region, playerId) => ({
    seasonId: season.id,
    playerId,
    awardType: "regional_mvp",
    region,
    sourceUrl: ANNOUNCEMENT,
  });
  assert.deepEqual(
    await callTool("propose_season_award", { ...regional("Europe", player.id), sourceUrl: "" }),
    { error: true },
    "propose_season_award requires a sourceUrl",
  );
  assert.deepEqual(
    await callTool("propose_season_award", {
      ...regional("Europe", player.id),
      sourceUrl: "https://liquipedia.net/rocketleague/Fake_League",
    }),
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
    await callTool("propose_season_award", regional("Europe", otherPlayer.id)),
    { error: true },
    "a region holds one Regional MVP",
  );

  const detail = await callTool("get_season", { id: season.id });
  assert.deepEqual(
    detail.awards.map(({ awardType, region, player: { id } }) => [awardType, region, id]),
    [
      ["season_mvp", null, player.id],
      ["regional_mvp", "Europe", player.id],
      ["regional_mvp", "North America", otherPlayer.id],
    ],
  );
  assert((await callTool("list_seasons", {})).some(({ id }) => id === season.id));

  const profile = (await request("GET", `/player/${player.id}/awards`)).json();
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
  assert.deepEqual((await request("GET", `/player/${player.id}/awards`)).json().seasonAwards, []);
}

export async function verifySeasonArchives({
  request,
  staffCookie,
  memberCookie,
  team,
  otherTeam,
  tournament,
  startggCupId,
}) {
  const slug = "fake-archive-2026";
  await request("POST", "/seasons", { name: "Fake Archive 2026", slug }, memberCookie, 403);
  const season = (
    await request("POST", "/seasons", { name: "Fake Archive 2026", slug }, staffCookie, 201)
  ).json();
  assert.equal(season.slug, slug);
  await request("POST", "/seasons", { name: "Fake Archive copy", slug }, staffCookie, 409);
  await request("GET", "/season-archives/fake-archive-unknown", undefined, undefined, 404);
  assert.deepEqual((await request("GET", `/season-archives/${slug}`)).json(), {
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
  ).json().participant;
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

  const detail = (await request("GET", `/seasons/${season.id}`, undefined, staffCookie)).json();
  const staffPath = detail.participants.find(({ id }) => id === winner.id).path;
  assert.deepEqual(
    staffPath.map(({ tournament: linked }) => linked?.source ?? null),
    ["startgg", tournament.source, null],
  );

  const archive = (await request("GET", `/season-archives/${slug}`)).json();
  assert.equal(archive.winner.id, team.id);
  assert.deepEqual(archive.format.phases, [{ name: "Fake splits", description: null }]);
  const publicPath = archive.participants.find(({ team: { id } }) => id === team.id).path;
  assert.deepEqual(
    publicPath.map(({ label }) => label),
    ["Fake Major", "Fake Regional"],
  );
  assert(!JSON.stringify(archive).includes(startggCupId));
  assert(
    (await request("GET", "/season-archives"))
      .json()
      .seasons.some((summary) => summary.slug === slug && summary.winner?.id === team.id),
  );

  await request("DELETE", `/seasons/${season.id}`, undefined, staffCookie, 204);
  await request("GET", `/season-archives/${slug}`, undefined, undefined, 404);
}
