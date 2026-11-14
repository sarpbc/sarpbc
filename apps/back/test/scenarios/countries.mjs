import assert from "node:assert/strict";

export async function verifyCountries({ request, staffCookie }) {
  const created = async (path, body) =>
    (await request("POST", path, body, staffCookie, 201)).json();

  const home = (await created("/team", { name: "Country Home Five" })).team;
  const away = (await created("/team", { name: "Country Away Five" })).team;
  await created("/player", { name: "Country Local", nationality: " tv ", teamId: home.id });
  await created("/player", { name: "Country Free Agent", nationality: "TV" });
  await created("/player", { name: "Country Visitor", nationality: "Tuvalu", teamId: away.id });

  const finishedMatchOf = async (source) => {
    const { tournament } = await created("/tournaments", {
      name: `Country ${source} Cup`,
      source,
      teamIds: [home.id, away.id],
    });

    return (
      await created(`/tournaments/${tournament.id}/matches`, {
        name: `Country ${source} Final`,
        beginAt: "2026-06-01T10:00:00Z",
        endAt: "2026-06-01T12:00:00Z",
        status: "finished",
        participantIds: tournament.participants.map(({ id }) => id),
      })
    ).match.id;
  };

  const manualFinal = await finishedMatchOf("manual");
  await finishedMatchOf("startgg");

  const { countries } = (await request("GET", "/countries")).json();
  assert.deepEqual(
    countries.find(({ code }) => code === "TV"),
    { code: "TV", playerCount: 2 },
    "stored nationalities are trimmed and upper-cased into one code",
  );
  assert(
    countries.every(({ code }) => /^[A-Z]{2}$/.test(code)),
    "values that are not a two-letter code stay off the index",
  );

  const { country } = (await request("GET", "/countries/tv")).json();
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
