import assert from "node:assert/strict";
import { z } from "zod";
import type { Payload, Request } from "./support.mts";

const team = z.looseObject({ id: z.string(), name: z.string() });

const countriesBody = z.object({
  countries: z.array(z.looseObject({ code: z.string(), playerCount: z.number() })),
});

const countryBody = z.object({
  country: z.looseObject({
    code: z.string(),
    players: z.array(z.looseObject({ name: z.string() })),
    teams: z.array(z.looseObject({ id: z.string() })),
    matches: z.array(z.looseObject({ id: z.string() })),
    matchTotal: z.number(),
  }),
});

export interface CountriesContext {
  request: Request;
  staffCookie: string;
}

export async function verifyCountries({ request, staffCookie }: CountriesContext): Promise<void> {
  async function created<T>(path: string, body: Payload, schema: z.ZodType<T>): Promise<T> {
    const response = await request("POST", path, body, staffCookie, 201);

    return response.json(schema);
  }

  const teamBody = z.object({ team });
  const playerBody = z.looseObject({});
  const response2 = await created("/team", { name: "Country Home Five" }, teamBody);
  const home = response2.team;
  const response3 = await created("/team", { name: "Country Away Five" }, teamBody);
  const away = response3.team;

  await created(
    "/player",
    { name: "Country Local", nationality: " tv ", teamId: home.id },
    playerBody,
  );
  await created("/player", { name: "Country Free Agent", nationality: "TV" }, playerBody);

  await created(
    "/player",
    { name: "Country Visitor", nationality: "Tuvalu", teamId: away.id },
    playerBody,
  );

  const finishedMatchOf = async (source: string): Promise<string> => {
    const { tournament } = await created(
      "/tournaments",
      {
        name: `Country ${source} Cup`,
        source,
        teamIds: [home.id, away.id],
      },
      z.object({
        tournament: z.looseObject({
          id: z.string(),
          participants: z.array(z.looseObject({ id: z.string() })),
        }),
      }),
    );

    const response4 = await created(
      `/tournaments/${tournament.id}/matches`,
      {
        name: `Country ${source} Final`,
        beginAt: "2026-06-01T10:00:00Z",
        endAt: "2026-06-01T12:00:00Z",
        status: "finished",
        participantIds: tournament.participants.map(({ id }) => id),
      },
      z.object({ match: z.looseObject({ id: z.string() }) }),
    );

    return response4.match.id;
  };

  const manualFinal = await finishedMatchOf("manual");
  await finishedMatchOf("startgg");

  const response5 = await request("GET", "/countries");
  const { countries } = response5.json(countriesBody);

  assert.deepEqual(
    countries.find(({ code }) => code === "TV"),
    { code: "TV", playerCount: 2 },
    "stored nationalities are trimmed and upper-cased into one code",
  );
  assert.ok(
    countries.every(({ code }) => /^[A-Z]{2}$/.test(code)),
    "values that are not a two-letter code stay off the index",
  );

  const response6 = await request("GET", "/countries/tv");
  const { country } = response6.json(countryBody);
  assert.equal(country.code, "TV");
  assert.deepEqual(
    country.players.map(({ name }) => name),
    ["Country Free Agent", "Country Local"],
  );
  assert.deepEqual(
    country.teams.map(({ id }) => id),
    [home.id],
  );
  assert.deepEqual(
    country.matches.map(({ id }) => id),
    [manualFinal],
    "the public country page leaves out start.gg matches",
  );
  assert.equal(country.matchTotal, 1);

  await request("GET", "/countries/tuvalu", undefined, undefined, 404);
  await request("GET", "/countries/zz", undefined, undefined, 404);
}
