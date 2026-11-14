import assert from "node:assert/strict";
import type { BracketLinkInput } from "@sarpbc/types";
import { z } from "zod";
import { mapSequentially } from "../../src/common/application/sequentially.ts";
import { byJoined } from "./support.mts";
import type { JsonResponse, Payload, Request } from "./support.mts";

const identified = z.looseObject({ id: z.string() });

type Identified = z.infer<typeof identified>;

const tournamentDetailMatch = z.looseObject({
  id: z.string(),
  name: z.string(),
  participants: z.array(identified),
  previousMatches: z.array(z.looseObject({ previousMatch: z.string(), type: z.string() })),
});

const tournamentDetail = z.looseObject({
  id: z.string(),
  hasBracket: z.boolean(),
  participants: z.array(z.looseObject({ id: z.string(), players: z.array(identified) })),
  matches: z.array(tournamentDetailMatch),
});

type TournamentDetail = z.infer<typeof tournamentDetail>;

const tournamentBody = z.object({ tournament: tournamentDetail });

const generatedMatches = z.object({
  matches: z.array(z.looseObject({ participants: z.array(identified), numberOfGames: z.number() })),
});

interface ManualBracketsContext {
  request: Request;
  staffCookie: string;
  memberCookie: string;
  competition: { tournamentId: string; matchId: string };
}

export const verifyManualBrackets = async ({
  request,
  staffCookie,
  memberCookie,
  competition,
}: ManualBracketsContext): Promise<void> => {
  const players: Identified[] = await mapSequentially(
    ["Fake Seed One", "Fake Seed Two", "Fake Seed Three", "Fake Seed Four"],
    async (name) => {
      const response = await request("POST", "/player", { name }, staffCookie, 201);

      return response.json(z.object({ player: identified })).player;
    },
  );

  const createStage = async (name: string): Promise<TournamentDetail> => {
    const response = await request(
      "POST",
      "/tournaments",
      { name, format: "1v1", playerParticipants: players.map(({ id }) => [id]) },
      staffCookie,
      201,
    );

    return response.json(tournamentBody).tournament;
  };

  const stage = await createStage("Fake Bracket Finals");
  assert.equal(stage.hasBracket, false);

  const participantsOf = (tournament: TournamentDetail): string[] =>
    players.map((player) => {
      const entry = tournament.participants.find(
        (participant) => participant.players[0].id === player.id,
      );

      assert.ok(entry, "the seeded player entered the stage");

      return entry.id;
    });

  const [p1, p2, p3, p4] = participantsOf(stage);

  const createMatch = async (body: Payload): Promise<Identified> => {
    const response2 = await request(
      "POST",
      `/tournaments/${stage.id}/matches`,
      body,
      staffCookie,
      201,
    );

    return response2.json(z.object({ match: identified })).match;
  };

  const semi1 = await createMatch({ name: "Semifinal 1", participantIds: [p1, p2] });
  const semi2 = await createMatch({ name: "Semifinal 2", participantIds: [p3, p4] });

  const feeders: BracketLinkInput[] = [
    { previousMatchId: semi1.id, type: "winner" },
    { previousMatchId: semi2.id, type: "winner" },
  ];

  await request(
    "POST",
    `/tournaments/${stage.id}/matches`,
    { name: "Grand Final", participantIds: [p1, p3], previousMatches: feeders },
    staffCookie,
    400,
  );
  await request("PATCH", `/tournaments/${stage.id}`, { hasBracket: true }, memberCookie, 403);

  const response3 = await request(
    "PATCH",
    `/tournaments/${stage.id}`,
    { hasBracket: true },
    staffCookie,
  );

  const enabled = response3.json(tournamentBody).tournament;

  assert.equal(enabled.hasBracket, true);

  const final = await createMatch({
    name: "Grand Final",
    participantIds: [p1, p3],
    previousMatches: feeders,
  });

  const response4 = await request("GET", `/tournaments/${stage.id}`);
  const detail = response4.json(tournamentBody).tournament;

  const detailFinal = detail.matches.find((match) => match.id === final.id);
  assert.equal(detail.hasBracket, true);
  assert.ok(detailFinal, "the final is part of the stage");
  assert.deepEqual(
    detailFinal.previousMatches
      .map(({ previousMatch, type }) => [previousMatch, type])
      .toSorted(byJoined),
    feeders.map(({ previousMatchId, type }) => [previousMatchId, type]).toSorted(byJoined),
    "the public stage carries the links the bracket tree is drawn from",
  );

  const setBracket = async (matchId: string, body: Payload, status = 200): Promise<JsonResponse> =>
    await request("PUT", `/tournaments/matches/${matchId}/bracket`, body, staffCookie, status);

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

  const response5 = await request(
    "PATCH",
    `/tournaments/${stage.id}`,
    { hasBracket: false },
    staffCookie,
  );

  assert.equal(response5.json(tournamentBody).tournament.hasBracket, false);

  const empty = await createStage("Fake Empty Bracket");
  await request("POST", `/tournaments/${empty.id}/bracket`, { teams: 4 }, staffCookie, 400);
  await request("PATCH", `/tournaments/${empty.id}`, { hasBracket: true }, staffCookie);
  await request("POST", `/tournaments/${empty.id}/bracket`, { teams: 6 }, staffCookie, 400);
  await request("POST", `/tournaments/${empty.id}/bracket`, { teams: 4 }, memberCookie, 403);

  const response6 = await request(
    "POST",
    `/tournaments/${empty.id}/bracket`,
    { teams: 4, numberOfGames: 7 },
    staffCookie,
    201,
  );

  const generated = response6.json(generatedMatches).matches;

  assert.equal(generated.length, 3);
  assert.ok(
    generated.every((match) => match.participants.length === 0 && match.numberOfGames === 7),
  );

  const response7 = await request("GET", `/tournaments/${empty.id}`);
  const tree = response7.json(tournamentBody).tournament.matches;

  const grandFinal = tree.find((match) => match.name === "Grand Final");
  assert.ok(grandFinal, "the generated bracket has a grand final");
  assert.deepEqual(
    grandFinal.previousMatches.map(({ previousMatch }) => previousMatch).toSorted(),
    tree
      .filter((match) => match.name.startsWith("Semifinal"))
      .map(({ id }) => id)
      .toSorted(),
  );
  const firstSemi = tree.find((match) => match.name === "Semifinal 1");
  assert.ok(firstSemi, "the generated bracket has a first semifinal");
  const [e1, e2] = participantsOf(empty);

  const setBracketResult = await setBracket(firstSemi.id, {
    participantIds: [e2, e1],
    previousMatches: [],
  });

  const filled = setBracketResult.json(z.object({ match: tournamentDetailMatch })).match;

  assert.deepEqual(
    filled.participants.map(({ id }) => id),
    [e2, e1],
  );
  await request("POST", `/tournaments/${empty.id}/bracket`, { teams: 4 }, staffCookie, 400);
};
