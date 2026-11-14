import assert from "node:assert/strict";
import { z } from "zod";
import { toolFailure } from "./support.mts";
import type { CallTool, Request, Review } from "./support.mts";

const teamAlias = z.strictObject({
  id: z.string(),
  name: z.string(),
  from: z.string(),
  to: z.string().nullable(),
  sourceUrl: z.string(),
  logoUrl: z.string().nullable(),
  pandascoreId: z.number().nullable(),
});

type TeamAlias = z.infer<typeof teamAlias>;

const aliasedTeam = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  aliases: z.array(teamAlias),
});

type AliasedTeam = z.infer<typeof aliasedTeam>;

const teamBody = z.object({ team: aliasedTeam });

const aliasBody = z.object({ alias: teamAlias });

const aliasList = z.object({ aliases: z.array(teamAlias) });

const stageBody = z.object({
  tournament: z.object({ id: z.string(), participants: z.array(z.object({ id: z.string() })) }),
});

const stageDetail = z.object({
  tournament: z.object({
    participants: z.array(
      z.object({
        id: z.string(),
        team: z
          .object({
            id: z.string(),
            name: z.string(),
            slug: z.string(),
            logoLightUrl: z.string().nullable(),
          })
          .nullable(),
      }),
    ),
  }),
});

const publicMatchBody = z.object({
  match: z.object({
    slug: z.string(),
    participants: z.array(
      z.object({ team: z.object({ id: z.string(), name: z.string() }).nullable() }),
    ),
  }),
});

export interface TeamAliasesContext {
  request: Request;
  staffCookie: string;
  memberCookie: string;
}

export interface TeamAliasFixtures {
  team: { id: string; slug: string };
  origins: TeamAlias;
}

export interface TeamAliasProposalsContext extends TeamAliasFixtures {
  request: Request;
  callTool: CallTool;
  review: Review;
}

const teamOf = async (request: Request, id: string): Promise<AliasedTeam> => {
  const response = await request("GET", `/team/${id}`);

  return response.json(teamBody).team;
};

const SOURCE = "https://www.rlesports.com/news/integration-rebrand";

const ORIGINS = {
  name: "Integration Origins",
  from: "2020-01-01",
  to: "2022-06-01",
  sourceUrl: SOURCE,
  logoUrl: "https://cdn.example.test/origins.png",
  pandascoreId: null,
};

export async function verifyTeamAliases({
  request,
  staffCookie,
  memberCookie,
}: TeamAliasesContext): Promise<TeamAliasFixtures> {
  const create = async (name: string): Promise<AliasedTeam> => {
    const response2 = await request("POST", "/team", { name }, staffCookie, 201);

    return response2.json(teamBody).team;
  };

  const team = await create("Integration Renamed");
  const opponent = await create("Integration Opponent");
  const aliasesPath = `/team/${team.id}/aliases`;

  await request("POST", aliasesPath, ORIGINS, memberCookie, 403);

  await Promise.all(
    [
      { ...ORIGINS, sourceUrl: "https://liquipedia.net/rocketleague/Integration_Origins" },
      { ...ORIGINS, sourceUrl: "https://www.liquipedia.org/rocketleague/Integration_Origins" },
      { ...ORIGINS, logoUrl: "https://liquipedia.net/commons/images/origins.png" },
      { ...ORIGINS, to: "2019-01-01" },
      { ...ORIGINS, sourceUrl: "" },
    ].map(async (refused) => await request("POST", aliasesPath, refused, staffCookie, 400)),
  );

  const { sourceUrl: _, ...unsourced } = ORIGINS;
  await request("POST", aliasesPath, unsourced, staffCookie, 400);
  const teamOfResult = await teamOf(request, team.id);
  assert.deepEqual(teamOfResult.aliases, []);

  const response3 = await request("POST", aliasesPath, ORIGINS, staffCookie, 201);
  const origins = response3.json(aliasBody).alias;

  assert.deepEqual(origins, { id: origins.id, ...ORIGINS });
  await request(
    "POST",
    aliasesPath,
    { ...ORIGINS, name: "Overlapping", from: "2021-01-01", to: null, logoUrl: null },
    staffCookie,
    422,
  );

  const response4 = await request(
    "POST",
    aliasesPath,
    { ...ORIGINS, name: "Integration Sponsored", from: "2022-06-01", to: null, logoUrl: null },
    staffCookie,
    201,
  );

  const sponsored = response4.json(aliasBody).alias;

  const teamOfResult2 = await teamOf(request, team.id);
  assert.deepEqual(
    teamOfResult2.aliases.map(({ name }) => name),
    ["Integration Origins", "Integration Sponsored"],
  );

  const response5 = await request("GET", "/search/teams?q=origins");
  const found = response5.json(z.array(z.object({ id: z.string() })));

  assert.deepEqual(
    found.map(({ id }) => id),
    [team.id],
    "search finds a team by a former name",
  );
  const response6 = await request("GET", "/team?name=sponsored");
  assert.equal(response6.json(z.object({ count: z.number() })).count, 1);

  const response7 = await request(
    "POST",
    "/tournaments",
    { name: "Integration Archive Cup", beginAt: "2021-05-01", teamIds: [team.id, opponent.id] },
    staffCookie,
    201,
  );

  const stage = response7.json(stageBody).tournament;

  const response8 = await request(
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
  );

  const later = response8.json(z.object({ match: z.object({ publicId: z.number() }) })).match;

  const response9 = await request("GET", `/tournaments/${stage.id}`);
  const detail = response9.json(stageDetail).tournament;

  const renamed = detail.participants.find(({ team: entry }) => entry?.id === team.id)?.team;
  assert.ok(renamed, "the stage lists the renamed team");
  assert.deepEqual(
    { name: renamed.name, slug: renamed.slug, logo: renamed.logoLightUrl },
    { name: "Integration Origins", slug: team.slug, logo: ORIGINS.logoUrl },
    "a stage shows the name and logo in force when it began",
  );

  const response10 = await request("GET", `/matches/${later.publicId}`);
  const publicMatch = response10.json(publicMatchBody).match;

  assert.equal(
    publicMatch.participants.find(({ team: entry }) => entry?.id === team.id)?.team?.name,
    "Integration Sponsored",
    "a match shows the name in force on its date",
  );
  assert.match(publicMatch.slug, /^integration-opponent-vs-integration-sponsored-/);
  const teamOfResult3 = await teamOf(request, team.id);
  assert.equal(teamOfResult3.name, "Integration Renamed");

  const response11 = await request(
    "PUT",
    `${aliasesPath}/${sponsored.id}`,
    { ...ORIGINS, name: "Integration Sponsored", from: "2022-06-01", to: "2024-01-01" },
    staffCookie,
  );

  const corrected = response11.json(aliasBody).alias;

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
  const teamOfResult4 = await teamOf(request, team.id);
  assert.deepEqual(
    teamOfResult4.aliases.map(({ id }) => id),
    [origins.id],
  );

  return { team, origins };
}

export async function verifyTeamAliasProposals({
  request,
  callTool,
  review,
  team,
  origins,
}: TeamAliasProposalsContext): Promise<void> {
  const proposal = {
    teamId: team.id,
    name: "Integration Founders",
    from: "2018-03-01",
    to: "2020-01-01",
    sourceUrl: "https://x.com/integration/status/2018",
  };

  assert.deepEqual(
    await callTool(
      "add_team_alias",
      {
        ...proposal,
        sourceUrl: "https://liquipedia.net/rocketleague/Integration_Founders",
      },
      toolFailure,
    ),
    { error: true },
  );
  assert.deepEqual(
    await callTool("add_team_alias", { ...proposal, to: "2021-01-01" }, toolFailure),
    {
      error: true,
    },
  );
  const queued = await callTool("add_team_alias", proposal);
  assert.equal(queued.status, "pending");
  const callToolResult = await callTool("list_team_aliases", { idOrSlug: team.slug }, aliasList);
  assert.equal(callToolResult.aliases.length, 1);
  const reviewResult = await review(queued);
  assert.equal(reviewResult.entityId, team.id);

  const updated = await callTool("update_team_alias", {
    ...proposal,
    aliasId: origins.id,
    name: "Integration Origins",
    from: "2020-01-01",
    to: "2022-06-01",
    sourceUrl: "https://www.pandascore.co/rl/teams/integration",
  });

  await review(updated);
  const { aliases } = await callTool("list_team_aliases", { idOrSlug: team.id }, aliasList);
  assert.deepEqual(
    aliases.map(({ name, sourceUrl, logoUrl }) => [name, sourceUrl, logoUrl]),
    [
      ["Integration Founders", proposal.sourceUrl, null],
      ["Integration Origins", "https://www.pandascore.co/rl/teams/integration", null],
    ],
  );
  const teamOfResult5 = await teamOf(request, team.id);
  assert.equal(teamOfResult5.aliases.length, 2);
}
