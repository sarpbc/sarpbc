import assert from "node:assert/strict";

const SOURCE = "https://www.rlesports.com/news/integration-rebrand";

const ORIGINS = {
  name: "Integration Origins",
  from: "2020-01-01",
  to: "2022-06-01",
  sourceUrl: SOURCE,
  logoUrl: "https://cdn.example.test/origins.png",
  pandascoreId: null,
};

export async function verifyTeamAliases({ request, staffCookie, memberCookie }) {
  const create = async (name) =>
    (await request("POST", "/team", { name }, staffCookie, 201)).json().team;

  const team = await create("Integration Renamed");
  const opponent = await create("Integration Opponent");
  const aliasesPath = `/team/${team.id}/aliases`;

  await request("POST", aliasesPath, ORIGINS, memberCookie, 403);

  for (const refused of [
    { ...ORIGINS, sourceUrl: "https://liquipedia.net/rocketleague/Integration_Origins" },
    { ...ORIGINS, sourceUrl: "https://www.liquipedia.org/rocketleague/Integration_Origins" },
    { ...ORIGINS, logoUrl: "https://liquipedia.net/commons/images/origins.png" },
    { ...ORIGINS, to: "2019-01-01" },
    { ...ORIGINS, sourceUrl: "" },
  ]) {
    await request("POST", aliasesPath, refused, staffCookie, 400);
  }

  const { sourceUrl: _, ...unsourced } = ORIGINS;
  await request("POST", aliasesPath, unsourced, staffCookie, 400);
  assert.deepEqual((await request("GET", `/team/${team.id}`)).json().team.aliases, []);

  const origins = (await request("POST", aliasesPath, ORIGINS, staffCookie, 201)).json().alias;
  assert.deepEqual(origins, { id: origins.id, ...ORIGINS });
  await request(
    "POST",
    aliasesPath,
    { ...ORIGINS, name: "Overlapping", from: "2021-01-01", to: null, logoUrl: null },
    staffCookie,
    422,
  );

  const sponsored = (
    await request(
      "POST",
      aliasesPath,
      { ...ORIGINS, name: "Integration Sponsored", from: "2022-06-01", to: null, logoUrl: null },
      staffCookie,
      201,
    )
  ).json().alias;

  assert.deepEqual(
    (await request("GET", `/team/${team.id}`)).json().team.aliases.map(({ name }) => name),
    ["Integration Origins", "Integration Sponsored"],
  );

  const found = (await request("GET", "/search/teams?q=origins")).json();
  assert.deepEqual(
    found.map(({ id }) => id),
    [team.id],
    "search finds a team by a former name",
  );
  assert.equal((await request("GET", "/team?name=sponsored")).json().count, 1);

  const stage = (
    await request(
      "POST",
      "/tournaments",
      { name: "Integration Archive Cup", beginAt: "2021-05-01", teamIds: [team.id, opponent.id] },
      staffCookie,
      201,
    )
  ).json().tournament;

  const later = (
    await request(
      "POST",
      `/tournaments/${stage.id}/matches`,
      {
        name: "Integration Archive Final",
        participantIds: stage.participants.map(({ id }) => id),
        beginAt: "2023-01-10T18:00:00.000Z",
        status: "not_started",
      },
      staffCookie,
      201,
    )
  ).json().match;

  const detail = (await request("GET", `/tournaments/${stage.id}`)).json().tournament;
  const renamed = detail.participants.find(({ team: entry }) => entry?.id === team.id).team;
  assert.deepEqual(
    { name: renamed.name, slug: renamed.slug, logo: renamed.logoLightUrl },
    { name: "Integration Origins", slug: team.slug, logo: ORIGINS.logoUrl },
    "a stage shows the name and logo in force when it began",
  );
  const publicMatch = (await request("GET", `/matches/${later.publicId}`)).json().match;
  assert.equal(
    publicMatch.participants.find(({ team: entry }) => entry?.id === team.id).team.name,
    "Integration Sponsored",
    "a match shows the name in force on its date",
  );
  assert.match(publicMatch.slug, /^integration-opponent-vs-integration-sponsored-/);
  assert.equal((await request("GET", `/team/${team.id}`)).json().team.name, "Integration Renamed");

  const corrected = (
    await request(
      "PUT",
      `${aliasesPath}/${sponsored.id}`,
      { ...ORIGINS, name: "Integration Sponsored", from: "2022-06-01", to: "2024-01-01" },
      staffCookie,
    )
  ).json().alias;

  assert.equal(corrected.to, "2024-01-01");
  await request("PUT", `${aliasesPath}/${origins.id}`, ORIGINS, memberCookie, 403);
  await request(
    "DELETE",
    `/team/${opponent.id}/aliases/${origins.id}`,
    undefined,
    staffCookie,
    404,
  );
  await request("DELETE", `${aliasesPath}/${sponsored.id}`, undefined, staffCookie, 204);
  assert.deepEqual(
    (await request("GET", `/team/${team.id}`)).json().team.aliases.map(({ id }) => id),
    [origins.id],
  );

  return { team, origins };
}

export async function verifyTeamAliasProposals({ request, callTool, review, team, origins }) {
  const proposal = {
    teamId: team.id,
    name: "Integration Founders",
    from: "2018-03-01",
    to: "2020-01-01",
    sourceUrl: "https://x.com/integration/status/2018",
  };

  assert.deepEqual(
    await callTool("add_team_alias", {
      ...proposal,
      sourceUrl: "https://liquipedia.net/rocketleague/Integration_Founders",
    }),
    { error: true },
  );
  assert.deepEqual(await callTool("add_team_alias", { ...proposal, to: "2021-01-01" }), {
    error: true,
  });
  const queued = await callTool("add_team_alias", proposal);
  assert.equal(queued.status, "pending");
  assert.equal((await callTool("list_team_aliases", { idOrSlug: team.slug })).aliases.length, 1);
  assert.equal((await review(queued)).entityId, team.id);

  const updated = await callTool("update_team_alias", {
    ...proposal,
    aliasId: origins.id,
    name: "Integration Origins",
    from: "2020-01-01",
    to: "2022-06-01",
    sourceUrl: "https://www.pandascore.co/rl/teams/integration",
  });

  await review(updated);
  const { aliases } = await callTool("list_team_aliases", { idOrSlug: team.id });
  assert.deepEqual(
    aliases.map(({ name, sourceUrl, logoUrl }) => [name, sourceUrl, logoUrl]),
    [
      ["Integration Founders", proposal.sourceUrl, null],
      ["Integration Origins", "https://www.pandascore.co/rl/teams/integration", null],
    ],
  );
  const listed = (await request("GET", `/team/${team.id}`)).json().team.aliases;
  assert.equal(listed.length, 2);
}
