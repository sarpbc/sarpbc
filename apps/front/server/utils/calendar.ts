import type { TournamentDetail, TournamentMatchListItem } from "@sarpbc/types";
import type { H3Event } from "h3";
import type { Match, MatchDetailResponse } from "~/types/matches";
import { buildIcs, type CalendarFeed } from "~/utils/calendar/ics";
import { isMatchOnCalendar, matchToCalendarEvent } from "~/utils/calendar/matchEvent";
import { tournamentStageLabel } from "~/utils/tournamentStageLabel";
import { getFetchStatusCode } from "./match-og";
import { apiFetch } from "~/utils/apiFetch";

interface TournamentResponse {
  tournament?: TournamentDetail;
}

interface TournamentMatchesResponse {
  matches?: TournamentMatchListItem[];
}

export function sendIcs(event: H3Event, ics: string, filename: string): string {
  setHeader(event, "Content-Type", "text/calendar; charset=utf-8");
  setHeader(event, "Content-Disposition", `inline; filename="${filename}"`);
  setHeader(event, "Cache-Control", "public, max-age=300");
  return ics;
}

export function parseIcsSlug(pathname: string): string | null {
  const segment = pathname.split("/").pop() ?? "";
  const match = segment.match(/^(.+)\.ics$/i);
  return match?.[1] ?? null;
}

function rethrowMappedFetchError(
  cause: unknown,
  notFoundMessage: string,
  badGatewayMessage: string,
): never {
  const statusCode = getFetchStatusCode(cause);
  if (statusCode === 404) {
    throw createError({ statusCode: 404, statusMessage: notFoundMessage });
  }
  throw createError({
    statusCode: 502,
    statusMessage: badGatewayMessage,
    cause,
  });
}

export async function fetchMatchForCalendar(id: string): Promise<Match> {
  try {
    const res = await apiFetch<MatchDetailResponse>(`/matches/${id}`);
    return res.match;
  } catch (cause) {
    rethrowMappedFetchError(cause, "Match not found", "Could not load match for calendar");
  }
}

export async function fetchTournamentForCalendar(
  id: string,
): Promise<{ tournament: TournamentDetail; matches: TournamentMatchListItem[] }> {
  let tournamentRes: TournamentResponse;
  let matchesRes: TournamentMatchesResponse;

  try {
    [tournamentRes, matchesRes] = await Promise.all([
      apiFetch<TournamentResponse>(`/tournaments/${id}`),
      apiFetch<TournamentMatchesResponse>(`/tournaments/${id}/matches`),
    ]);
  } catch (cause) {
    rethrowMappedFetchError(
      cause,
      "Tournament not found",
      "Could not load tournament for calendar",
    );
  }

  if (!tournamentRes.tournament) {
    throw createError({ statusCode: 404, statusMessage: "Tournament not found" });
  }

  return {
    tournament: tournamentRes.tournament,
    matches: matchesRes.matches ?? [],
  };
}

export function buildMatchIcs(match: Match, now: Date): string {
  const event = matchToCalendarEvent(match, match.tournament, now);
  if (!event) {
    throw createError({ statusCode: 404, statusMessage: "Match has no scheduled time" });
  }

  const feed: CalendarFeed = {
    name: event.summary,
    dtStamp: now,
    events: [event],
  };

  return buildIcs(feed);
}

export function buildTournamentIcs(
  tournament: TournamentDetail,
  matches: TournamentMatchListItem[],
  now: Date,
): string {
  const events = matches
    .filter((match) => isMatchOnCalendar(match))
    .map((match) => matchToCalendarEvent(match, tournament, now))
    .filter((event) => event != null);

  return buildIcs({
    name: tournamentStageLabel(tournament),
    dtStamp: now,
    events,
  });
}

export function icsFilename(prefix: string, id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "event";
  return `sarpbc-${prefix}-${safe}.ics`;
}
