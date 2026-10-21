import { v4 } from "uuid";
import { InvalidInputError, NotFoundError } from "../../../common/domain/errors";
import { Match } from "../../domain/competition";
import type { MatchWriter } from "../ports";
import type { UpsertMatchInput } from "../inputs";
import { deriveWinnerParticipantId } from "./derive-match-winner";
export async function upsertMatchInTransaction(
  writer: MatchWriter,
  tournamentId: string,
  input: UpsertMatchInput,
): Promise<Match> {
  const tournament = await writer.tournament(tournamentId);
  if (!tournament) throw new NotFoundError("Tournament not found");
  const available = await writer.participants(tournamentId),
    ids = new Set(input.participantIds),
    participants = available.filter((p) => ids.has(p.id));
  if (participants.length !== input.participantIds.length)
    throw new InvalidInputError("Some participants not found in this tournament");
  let match = input.pandascoreId ? await writer.byPandascoreId(input.pandascoreId) : null;
  if (!match) {
    match = new Match();
    match.tournament = tournament;
    match.pandascoreId = input.pandascoreId ?? null;
  }
  match.name = input.name;
  match.beginAt = input.beginAt ?? null;
  match.endAt = input.endAt ?? null;
  match.status = input.status ?? null;
  match.numberOfGames = input.numberOfGames ?? null;
  match.participants = participants;
  if (input.officialStreams !== undefined) match.officialStreams = input.officialStreams;
  if (input.previous_matches?.length) {
    match.previousMatches = [];
    for (const link of input.previous_matches) {
      const previous = await writer.byPandascoreId(link.match_id);
      if (previous)
        match.previousMatches.push({
          id: v4(),
          match: { id: match.id },
          previousMatch: { id: previous.id },
          type: link.type,
        });
    }
  }
  if (input.results) {
    match.results = [];
    for (const r of input.results) {
      const participant = participants.find((p) => p.id === r.participantId);
      if (participant)
        match.results.push({
          id: v4(),
          match: { id: match.id },
          participant: { id: participant.id },
          score: r.score,
        });
    }
  }
  const finished = match.status === "finished" || Boolean(match.endAt);
  if (finished && input.results) {
    const winnerId = deriveWinnerParticipantId(
      input.results.filter((r): r is { participantId: string; score: number } =>
        Boolean(r.participantId),
      ),
    );
    if (winnerId) {
      match.winner = participants.find((p) => p.id === winnerId) ?? null;
      if (match.winner) match.status = "finished";
    }
  }
  await writer.save(match);
  return match;
}
export async function setWinnerInTransaction(
  writer: MatchWriter,
  id: string,
  winnerId: string,
): Promise<Match> {
  const match = await writer.load(id);
  if (!match) throw new NotFoundError("Match not found");
  const winner = match.participants.find((p) => p.id === winnerId);
  if (!winner) throw new InvalidInputError("Winner must be a participant in this match");
  match.winner = winner;
  match.status = "finished";
  await writer.save(match);
  return match;
}
