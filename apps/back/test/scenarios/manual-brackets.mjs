import assert from "node:assert/strict";

export async function verifyManualBrackets({ request, staffCookie, memberCookie, competition }) {
  const players = [];
  for (const name of ["Fake Seed One", "Fake Seed Two", "Fake Seed Three", "Fake Seed Four"])
    players.push((await request("POST", "/player", { name }, staffCookie, 201)).json().player);
  const createStage = async (name) =>
    (
      await request(
        "POST",
        "/tournaments",
        { name, format: "1v1", playerParticipants: players.map(({ id }) => [id]) },
        staffCookie,
        201,
      )
    ).json().tournament;
  const stage = await createStage("Fake Bracket Finals");
  assert.equal(stage.hasBracket, false);
  const participantsOf = (tournament) =>
    players.map(
      (player) =>
        tournament.participants.find((participant) => participant.players[0].id === player.id).id,
    );
  const [p1, p2, p3, p4] = participantsOf(stage);
  const createMatch = async (body, status = 201) =>
    (await request("POST", `/tournaments/${stage.id}/matches`, body, staffCookie, status)).json()
      .match;
  const semi1 = await createMatch({ name: "Semifinal 1", participantIds: [p1, p2] });
  const semi2 = await createMatch({ name: "Semifinal 2", participantIds: [p3, p4] });
  const feeders = [
    { previousMatchId: semi1.id, type: "winner" },
    { previousMatchId: semi2.id, type: "winner" },
  ];

  await createMatch(
    { name: "Grand Final", participantIds: [p1, p3], previousMatches: feeders },
    400,
  );
  await request("PATCH", `/tournaments/${stage.id}`, { hasBracket: true }, memberCookie, 403);
  const enabled = (
    await request("PATCH", `/tournaments/${stage.id}`, { hasBracket: true }, staffCookie)
  ).json().tournament;
  assert.equal(enabled.hasBracket, true);

  const final = await createMatch({
    name: "Grand Final",
    participantIds: [p1, p3],
    previousMatches: feeders,
  });
  const detail = (await request("GET", `/tournaments/${stage.id}`)).json().tournament;
  assert.equal(detail.hasBracket, true);
  assert.deepEqual(
    detail.matches
      .find((match) => match.id === final.id)
      .previousMatches.map(({ previousMatch, type }) => [previousMatch, type])
      .sort(),
    feeders.map(({ previousMatchId, type }) => [previousMatchId, type]).sort(),
    "the public stage carries the links the bracket tree is drawn from",
  );

  const setBracket = (matchId, body, status = 200) =>
    request("PUT", `/tournaments/matches/${matchId}/bracket`, body, staffCookie, status);
  await setBracket(
    semi1.id,
    { participantIds: [p1, p2], previousMatches: [{ previousMatchId: final.id, type: "winner" }] },
    400,
  );
  await setBracket(
    semi2.id,
    {
      participantIds: [p3, p4],
      previousMatches: [{ previousMatchId: competition.matchId, type: "winner" }],
    },
    400,
  );
  await setBracket(competition.matchId, { participantIds: [], previousMatches: [] }, 400);
  await request(
    "PATCH",
    `/tournaments/${competition.tournamentId}`,
    { hasBracket: true },
    staffCookie,
    400,
  );
  await request("PATCH", `/tournaments/${stage.id}`, { hasBracket: false }, staffCookie, 400);

  await request("DELETE", `/tournaments/matches/${semi1.id}`, undefined, staffCookie, 409);
  await request("DELETE", `/tournaments/matches/${final.id}`, undefined, staffCookie, 204);
  await request("DELETE", `/tournaments/matches/${semi1.id}`, undefined, staffCookie, 204);
  await request("POST", `/tournaments/${stage.id}/bracket`, { teams: 4 }, staffCookie, 400);
  await request("DELETE", `/tournaments/matches/${semi2.id}`, undefined, staffCookie, 204);
  assert.equal(
    (await request("PATCH", `/tournaments/${stage.id}`, { hasBracket: false }, staffCookie)).json()
      .tournament.hasBracket,
    false,
  );

  const empty = await createStage("Fake Empty Bracket");
  await request("POST", `/tournaments/${empty.id}/bracket`, { teams: 4 }, staffCookie, 400);
  await request("PATCH", `/tournaments/${empty.id}`, { hasBracket: true }, staffCookie);
  await request("POST", `/tournaments/${empty.id}/bracket`, { teams: 6 }, staffCookie, 400);
  await request("POST", `/tournaments/${empty.id}/bracket`, { teams: 4 }, memberCookie, 403);
  const generated = (
    await request(
      "POST",
      `/tournaments/${empty.id}/bracket`,
      { teams: 4, numberOfGames: 7 },
      staffCookie,
      201,
    )
  ).json().matches;
  assert.equal(generated.length, 3);
  assert(generated.every((match) => match.participants.length === 0 && match.numberOfGames === 7));
  const tree = (await request("GET", `/tournaments/${empty.id}`)).json().tournament.matches;
  const grandFinal = tree.find((match) => match.name === "Grand Final");
  assert.deepEqual(
    grandFinal.previousMatches.map(({ previousMatch }) => previousMatch).sort(),
    tree
      .filter((match) => match.name.startsWith("Semifinal"))
      .map(({ id }) => id)
      .sort(),
  );
  const firstSemi = tree.find((match) => match.name === "Semifinal 1");
  const [e1, e2] = participantsOf(empty);
  const filled = (
    await setBracket(firstSemi.id, { participantIds: [e2, e1], previousMatches: [] })
  ).json().match;
  assert.deepEqual(
    filled.participants.map(({ id }) => id),
    [e2, e1],
  );
  await request("POST", `/tournaments/${empty.id}/bracket`, { teams: 4 }, staffCookie, 400);
}
