import type {
  AttachReplayInput,
  EventInput,
  League,
  LeagueInput,
  ManualEvent,
  MatchLineupInput,
  MatchLineupsResponse,
  PlayerAwardType,
  StatsImport,
  StatsPlayerAccounts,
  StatsPlayerLinkInput,
  StatsPlayerLinkResult,
  TournamentAwardListItem,
  TournamentDetail,
  TournamentListItem,
  TournamentMatchListItem,
  TournamentPrizes,
  TournamentFormat,
  TournamentStatsGame,
} from "@sarpbc/types";
import type { StreamScoreSeriesResult } from "@sarpbc/utils";

export async function getAllTournaments(query: {
  limit: number;
  offset: number;
}): Promise<{ tournaments: TournamentListItem[]; total: number }> {
  const res = await apiFetch<{ tournaments: TournamentListItem[]; count: number }>("/tournaments", {
    method: "GET",
    query,
  });

  return { tournaments: res.tournaments, total: res.count };
}

export async function getTournamentById(id: string): Promise<TournamentDetail> {
  const res = await apiFetch<{ tournament: TournamentDetail }>(`/tournaments/${id}`, {
    method: "GET",
  });

  return res.tournament;
}

export async function syncTournament(tournamentId: string): Promise<void> {
  await apiFetch(`/tournaments/${tournamentId}/sync`, { method: "POST" });
}

export async function getTournamentMatches(
  tournamentId: string,
): Promise<TournamentMatchListItem[]> {
  const res = await apiFetch<{ matches: TournamentMatchListItem[] }>(
    `/tournaments/${tournamentId}/matches`,
    { method: "GET" },
  );

  return res.matches;
}

export async function enableTournamentPickems(tournamentId: string): Promise<void> {
  await apiFetch(`/tournaments/${tournamentId}/enable-pickems`, {
    method: "POST",
    body: { enabled: true },
  });
}

export async function syncTournamentAdditions(): Promise<void> {
  await apiFetch("/tournaments/sync/additions", { method: "POST" });
}

export async function getTournamentsWithoutMatches(): Promise<{ id: string; name: string }[]> {
  const res = await apiFetch<{ tournaments: { id: string; name: string }[] }>(
    "/tournaments/without-matches",
    { method: "GET" },
  );

  return res.tournaments;
}

export async function setMatchWinner(matchId: string, winnerId: string): Promise<void> {
  await apiFetch(`/tournaments/matches/${matchId}/winner`, {
    method: "PUT",
    body: { winnerId },
  });
}

export async function setMatchResult(
  matchId: string,
  results: StreamScoreSeriesResult[],
): Promise<void> {
  await apiFetch(`/tournaments/matches/${matchId}/result`, {
    method: "PUT",
    body: { results },
  });
}

export async function setMatchSource(matchId: string, sourceUrl: string | null): Promise<void> {
  await apiFetch(`/tournaments/matches/${matchId}/source`, {
    method: "PUT",
    body: { sourceUrl },
  });
}

export async function getMatchLineups(matchId: string): Promise<MatchLineupsResponse> {
  return await apiFetch<MatchLineupsResponse>(`/tournaments/matches/${matchId}/lineups`, {
    method: "GET",
  });
}

export async function setMatchLineups(
  matchId: string,
  lineups: MatchLineupInput[],
): Promise<MatchLineupsResponse> {
  return await apiFetch<MatchLineupsResponse>(`/tournaments/matches/${matchId}/lineups`, {
    method: "PUT",
    body: { lineups },
  });
}

/** A manual league can share its name with a synced one, so synced options say where they come from. */
export function leagueOptions(leagues: League[], pandascoreLabel: string) {
  return leagues.map((league) => ({
    value: league.id,
    label: league.pandascoreId === null ? league.name : `${league.name} · ${pandascoreLabel}`,
  }));
}

export interface ManualTournamentInput {
  name: string;
  eventId?: string;
  slug?: string;
  tier?: string | null;
  leagueId?: string | null;
  beginAt?: string | null;
  endAt?: string | null;
  imageUrl?: string | null;
  format?: TournamentFormat;
  teamIds?: string[];
  playerParticipants?: string[][];
  rosters?: { teamId: string; playerIds: string[]; sourceUrl?: string | null }[];
  hasBracket?: boolean;
}

export async function getTournamentLeagues(): Promise<League[]> {
  const res = await apiFetch<{ leagues: League[] }>("/tournaments/leagues", {
    method: "GET",
  });

  return res.leagues;
}

export async function createLeague(body: LeagueInput): Promise<League> {
  const res = await apiFetch<{ league: League }>("/tournaments/leagues", {
    method: "POST",
    body,
  });

  return res.league;
}

export async function updateLeague(id: string, body: LeagueInput): Promise<League> {
  const res = await apiFetch<{ league: League }>(`/tournaments/leagues/${id}`, {
    method: "PATCH",
    body,
  });

  return res.league;
}

export async function getManualEvents(): Promise<ManualEvent[]> {
  const res = await apiFetch<{ events: ManualEvent[] }>("/events/manual", { method: "GET" });

  return res.events;
}

export async function getManualEvent(id: string): Promise<ManualEvent> {
  const res = await apiFetch<{ event: ManualEvent }>(`/events/manual/${id}`, { method: "GET" });

  return res.event;
}

export async function createEvent(body: EventInput): Promise<ManualEvent> {
  const res = await apiFetch<{ event: ManualEvent }>("/events", { method: "POST", body });

  return res.event;
}

export async function updateEvent(id: string, body: EventInput): Promise<ManualEvent> {
  const res = await apiFetch<{ event: ManualEvent }>(`/events/${id}`, { method: "PATCH", body });

  return res.event;
}

export async function deleteEvent(id: string): Promise<void> {
  await apiFetch(`/events/${id}`, { method: "DELETE" });
}

export async function createTournament(body: ManualTournamentInput): Promise<TournamentDetail> {
  const res = await apiFetch<{ tournament: TournamentDetail }>("/tournaments", {
    method: "POST",
    body,
  });

  return res.tournament;
}

export async function updateTournament(
  id: string,
  body: Partial<ManualTournamentInput>,
): Promise<TournamentDetail> {
  const res = await apiFetch<{ tournament: TournamentDetail }>(`/tournaments/${id}`, {
    method: "PATCH",
    body,
  });

  return res.tournament;
}

export async function getTournamentAwards(
  tournamentId: string,
): Promise<TournamentAwardListItem[]> {
  const res = await apiFetch<{ awards: TournamentAwardListItem[] }>(
    `/tournaments/${tournamentId}/awards`,
    { method: "GET" },
  );

  return res.awards;
}

export async function createTournamentAward(
  tournamentId: string,
  payload: { participantId: string; playerId: string; awardType: PlayerAwardType },
): Promise<TournamentAwardListItem> {
  const res = await apiFetch<{ award: TournamentAwardListItem }>(
    `/tournaments/${tournamentId}/awards`,
    { method: "POST", body: payload },
  );

  return res.award;
}

export async function deleteTournamentAward(tournamentId: string, awardId: string): Promise<void> {
  await apiFetch(`/tournaments/${tournamentId}/awards/${awardId}`, { method: "DELETE" });
}

export interface TournamentPrizeInput {
  placement: number;
  amount: number;
  currency: string;
  teamId: string;
  playerIds: string[];
  sourceUrl: string | null;
}

export async function getTournamentPrizes(tournamentId: string): Promise<TournamentPrizes> {
  return await apiFetch<TournamentPrizes>(`/tournaments/${tournamentId}/prizes`, { method: "GET" });
}

export async function setTournamentPrizes(
  tournamentId: string,
  prizes: TournamentPrizeInput[],
): Promise<TournamentPrizes> {
  return await apiFetch<TournamentPrizes>(`/tournaments/${tournamentId}/prizes`, {
    method: "PUT",
    body: { prizes },
  });
}

export async function getStatsImports(tournamentId: string): Promise<StatsImport[]> {
  const res = await apiFetch<{ imports: StatsImport[] }>(
    `/tournaments/${tournamentId}/stats-imports`,
    { method: "GET" },
  );

  return res.imports;
}

export async function requestStatsImport(
  tournamentId: string,
  group: string,
): Promise<StatsImport> {
  return await apiFetch<StatsImport>(`/tournaments/${tournamentId}/stats-imports`, {
    method: "POST",
    body: { group },
  });
}

export async function getStatsPlayerAccounts(tournamentId: string): Promise<StatsPlayerAccounts> {
  return await apiFetch<StatsPlayerAccounts>(`/tournaments/${tournamentId}/stats-players`, {
    method: "GET",
  });
}

export async function getTournamentStatsGames(
  tournamentId: string,
): Promise<TournamentStatsGame[]> {
  const res = await apiFetch<{ games: TournamentStatsGame[] }>(
    `/tournaments/${tournamentId}/stats-games`,
    { method: "GET" },
  );

  return res.games;
}

export async function attachStatsReplay(
  tournamentId: string,
  body: AttachReplayInput,
): Promise<TournamentStatsGame> {
  return await apiFetch<TournamentStatsGame>(`/tournaments/${tournamentId}/stats-games`, {
    method: "POST",
    body,
  });
}

export async function removeStatsGame(
  tournamentId: string,
  matchId: string,
  number: number,
): Promise<TournamentStatsGame> {
  return await apiFetch<TournamentStatsGame>(
    `/tournaments/${tournamentId}/stats-games/${matchId}/${number}`,
    { method: "DELETE" },
  );
}

export async function linkStatsPlayer(
  tournamentId: string,
  body: StatsPlayerLinkInput,
): Promise<StatsPlayerLinkResult> {
  return await apiFetch<StatsPlayerLinkResult>(`/tournaments/${tournamentId}/stats-players/link`, {
    method: "PUT",
    body,
  });
}
