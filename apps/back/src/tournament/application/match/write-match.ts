import { v4 } from "uuid";
import { InvalidInputError, NotFoundError } from "../../../common/domain/errors";
import { Match, type TournamentParticipant } from "../../domain/competition";
import type { MatchWriter } from "../ports";
import type {
  EmptyBracketInput,
  ManualMatchInput,
  MatchFields,
  SyncedMatchInput,
  UpdateMatchInput,
} from "../inputs";
import { winnerFromResults } from "@sarpbc/utils";
import {
  normalizeMatchVods,
  replaceGameVods,
  type MatchVodInput,
  type MatchVodLink,
} from "../../domain/match-vod";
import {
  assertBracketLinks,
  assertManualBracketMatch,
  emptySingleEliminationBracket,
} from "../../domain/bracket";
import type { BracketLinkInput } from "@sarpbc/types";
import { parseDataSourceUrl } from "../../../common/domain/data-source";
async function requireParticipants(
  writer: MatchWriter,
  tournamentId: string,
  participantIds: string[],
) {
  const available = await writer.participants(tournamentId),
    ids = new Set(participantIds),
    participants = available.filter((p) => ids.has(p.id));
  if (participants.length !== participantIds.length)
    throw new InvalidInputError("Some participants not found in this tournament");
  return participants;
}
function toBracketLinks(matchId: string, links: readonly BracketLinkInput[]) {
  return links.map((link) => ({
    id: v4(),
    match: { id: matchId },
    previousMatch: { id: link.previousMatchId },
    type: link.type,
  }));
}
async function setBracketLinks(
  writer: MatchWriter,
  match: Match,
  links: readonly BracketLinkInput[],
): Promise<void> {
  assertManualBracketMatch(match);
  assertBracketLinks(match.id, links, await writer.bracket(match.tournament.id));
  match.previousMatches = toBracketLinks(match.id, links);
}
async function saveMatch(
  writer: MatchWriter,
  match: Match,
  participants: TournamentParticipant[],
  input: MatchFields,
): Promise<Match> {
  const previousEndAt = match.endAt;
  match.name = input.name;
  match.beginAt = input.beginAt ?? null;
  match.endAt = input.endAt ?? null;
  match.status = input.status ?? null;
  match.numberOfGames = input.numberOfGames ?? null;
  match.participants = participants;
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
  if (match.hasEnded() && input.results) {
    const winnerId = winnerFromResults(
      input.results.filter((r): r is { participantId: string; score: number } =>
        Boolean(r.participantId),
      ),
    );
    if (winnerId) {
      match.winner = participants.find((p) => p.id === winnerId) ?? null;
      if (match.winner) match.status = "finished";
    }
  }
  match.stampEnd(previousEndAt ?? new Date());
  await writer.save(match);
  return match;
}
export async function createMatchInTransaction(
  writer: MatchWriter,
  tournamentId: string,
  input: ManualMatchInput,
): Promise<Match> {
  const tournament = await writer.tournament(tournamentId);
  if (!tournament) throw new NotFoundError("Tournament not found");
  const participants = await requireParticipants(writer, tournamentId, input.participantIds);
  const match = new Match();
  match.tournament = tournament;
  match.source = tournament.source === "startgg" ? "startgg" : "manual";
  match.sourceUrl = parseDataSourceUrl(input.sourceUrl ?? null);
  if (input.previousMatches?.length) await setBracketLinks(writer, match, input.previousMatches);
  return saveMatch(writer, match, participants, input);
}
export async function createEmptyBracketInTransaction(
  writer: MatchWriter,
  tournamentId: string,
  input: EmptyBracketInput,
): Promise<Match[]> {
  const tournament = await writer.tournament(tournamentId);
  if (!tournament) throw new NotFoundError("Tournament not found");
  if (tournament.source === "pandascore")
    throw new InvalidInputError("PandaScore manages the matches of this stage.");
  const stage = await writer.bracket(tournamentId);
  if (!stage.hasBracket)
    throw new InvalidInputError("Enable the bracket on this stage before generating it.");
  if (stage.matches.length > 0)
    throw new InvalidInputError(
      "This stage already has matches. Generate an empty bracket on a stage without matches.",
    );
  const planned = emptySingleEliminationBracket(input.teams).map((slot) => {
    const match = new Match();
    match.tournament = tournament;
    match.source = tournament.source === "startgg" ? "startgg" : "manual";
    return { slot, match };
  });
  for (const { slot, match } of planned) {
    match.previousMatches = toBracketLinks(
      match.id,
      slot.previousMatches.flatMap(({ index, type }) => {
        const previous = planned[index];
        return previous ? [{ previousMatchId: previous.match.id, type }] : [];
      }),
    );
    await saveMatch(writer, match, [], {
      name: slot.name,
      status: "not_started",
      numberOfGames: input.numberOfGames,
      participantIds: [],
    });
  }
  return planned.map(({ match }) => match);
}
export async function upsertSyncedMatchInTransaction(
  writer: MatchWriter,
  tournamentId: string,
  input: SyncedMatchInput,
): Promise<Match> {
  const tournament = await writer.tournament(tournamentId);
  if (!tournament) throw new NotFoundError("Tournament not found");
  const participants = await requireParticipants(writer, tournamentId, input.participantIds);
  let match = await writer.byPandascoreId(input.pandascoreId);
  if (!match) {
    match = new Match();
    match.tournament = tournament;
    match.pandascoreId = input.pandascoreId;
    match.source = "pandascore";
  }
  if (input.officialStreams !== undefined) match.officialStreams = input.officialStreams;
  if (input.previousMatches?.length) {
    match.previousMatches = [];
    for (const link of input.previousMatches) {
      const previous = await writer.byPandascoreId(link.matchPandascoreId);
      if (previous)
        match.previousMatches.push({
          id: v4(),
          match: { id: match.id },
          previousMatch: { id: previous.id },
          type: link.type,
        });
    }
  }
  return saveMatch(writer, match, participants, input);
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
  match.stampEnd(new Date());
  await writer.save(match);
  return match;
}
export async function updateMatchInTransaction(
  writer: MatchWriter,
  id: string,
  input: UpdateMatchInput,
): Promise<Match> {
  const match = await writer.load(id);
  if (!match) throw new NotFoundError("Match not found");
  if (match.pandascoreId !== null)
    throw new InvalidInputError("PandaScore manages the score, status and dates of this match");
  if (input.participantIds !== undefined)
    await replaceParticipants(writer, match, input.participantIds, input.results !== undefined);
  if (input.previousMatches !== undefined)
    await setBracketLinks(writer, match, input.previousMatches);
  if (input.sourceUrl !== undefined) match.sourceUrl = parseDataSourceUrl(input.sourceUrl);
  if (input.beginAt !== undefined) match.beginAt = input.beginAt;
  if (input.endAt !== undefined) match.endAt = input.endAt;
  if (input.status !== undefined) match.status = input.status;
  if (input.status !== undefined && input.status !== "finished" && input.endAt === undefined)
    match.endAt = null;
  if (input.results) {
    const ids = new Set(match.participants.map((p) => p.id));
    if (input.results.some((r) => !ids.has(r.participantId)))
      throw new InvalidInputError("Scores must belong to participants in this match");
    match.results = input.results.map((r) => ({
      id: v4(),
      match: { id: match.id },
      participant: { id: r.participantId },
      score: r.score,
    }));
  }
  const finished = input.status ? input.status === "finished" : match.hasEnded();
  if (!finished) {
    match.winner = null;
  } else {
    const winnerId = winnerFromResults(
      match.results.map((r) => ({ participantId: r.participant.id, score: r.score })),
    );
    const winner = match.participants.find((p) => p.id === winnerId) ?? null;
    // A staff-picked winner survives a status-only update on a drawn or unscored match.
    if (winner || input.results) match.winner = winner;
    if (match.winner) match.status = "finished";
  }
  match.stampEnd(new Date());
  await writer.save(match);
  return match;
}
async function replaceParticipants(
  writer: MatchWriter,
  match: Match,
  participantIds: readonly string[],
  rescored: boolean,
): Promise<void> {
  assertManualBracketMatch(match);
  if (new Set(participantIds).size !== participantIds.length)
    throw new InvalidInputError("Each participant can only play a match once.");
  const participants = await requireParticipants(writer, match.tournament.id, [...participantIds]);
  const current = new Set(match.participants.map((p) => p.id));
  const changed =
    current.size !== participantIds.length || participantIds.some((id) => !current.has(id));
  if (changed && !rescored && (match.results.length > 0 || match.winner))
    throw new InvalidInputError(
      "This match already has scores or a winner. Send its new scores with the participants.",
    );
  match.participants = participantIds.flatMap((id) => participants.find((p) => p.id === id) ?? []);
  if (match.winner && !participantIds.includes(match.winner.id)) match.winner = null;
}
export async function setVodsInTransaction(
  writer: MatchWriter,
  id: string,
  vods: readonly MatchVodInput[],
): Promise<Match> {
  const match = await writer.load(id);
  if (!match) throw new NotFoundError("Match not found");
  match.vods = normalizeMatchVods(vods, match.numberOfGames);
  await writer.save(match);
  return match;
}
export async function setSourceInTransaction(
  writer: MatchWriter,
  id: string,
  sourceUrl: string | null,
): Promise<Match> {
  const match = await writer.load(id);
  if (!match) throw new NotFoundError("Match not found");
  match.sourceUrl = parseDataSourceUrl(sourceUrl);
  await writer.save(match);
  return match;
}
export async function setGameVodsInTransaction(
  writer: MatchWriter,
  id: string,
  game: number,
  links: readonly MatchVodLink[],
): Promise<Match> {
  const match = await writer.load(id);
  if (!match) throw new NotFoundError("Match not found");
  match.vods = replaceGameVods(match.vods, game, links, match.numberOfGames);
  await writer.save(match);
  return match;
}
