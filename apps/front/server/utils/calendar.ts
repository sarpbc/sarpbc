import type { TournamentDetail, TournamentMatchListItem } from "@sarpbc/types";
import type { H3Event } from "h3";
import { apiFetch } from "@sarpbc/composables/api-fetch";
import type { Match } from "~/types/matches";
import { rethrowApiError } from "./api-error";
import { getMatchById } from "~/composables/matches/api";
import { buildIcs } from "~/utils/calendar/ics";
import type { CalendarFeed } from "~/utils/calendar/ics";
import { isMatchOnCalendar, matchToCalendarEvent } from "~/utils/calendar/match-event";
import { tournamentStageLabel } from "@sarpbc/utils";

interface TournamentResponse {
  tournament?: TournamentDetail;
}

interface TournamentMatchesResponse {
  matches?: TournamentMatchListItem[];
}

export const sendIcs = (event: H3Event, ics: string, filename: string): string => {
  setHeader(event, "Content-Type", "text/calendar; charset=utf-8");
  setHeader(event, "Content-Disposition", `inline; filename="${filename}"`);
  setHeader(event, "Cache-Control", "public, max-age=300");

  return ics;
};

export const parseIcsSlug = (pathname: string): string | null => {
  const segment = pathname.split("/").pop() ?? "";
  const match = /^(?<slug>.+)\.ics$/iu.exec(segment);

  return match?.groups?.slug ?? null;
};

export const fetchMatchForCalendar = async (id: string): Promise<Match> => {
  try {
    const { match } = await getMatchById(id);

    return match;
  } catch (error) {
    return rethrowApiError(error, {
      notFound: "Match not found",
      badGateway: "Could not load match for calendar",
    });
  }
};

export const fetchTournamentForCalendar = async (
  id: string,
): Promise<{ tournament: TournamentDetail; matches: TournamentMatchListItem[] }> => {
  let tournamentRes: TournamentResponse;
  let matchesRes: TournamentMatchesResponse;

  try {
    [tournamentRes, matchesRes] = await Promise.all([
      apiFetch<TournamentResponse>(`/tournaments/${id}`),
      apiFetch<TournamentMatchesResponse>(`/tournaments/${id}/matches`),
    ]);
  } catch (error) {
    rethrowApiError(error, {
      notFound: "Tournament not found",
      badGateway: "Could not load tournament for calendar",
    });
  }

  if (!tournamentRes.tournament) {
    throw createError({ statusCode: 404, statusMessage: "Tournament not found" });
  }

  return {
    tournament: tournamentRes.tournament,
    matches: matchesRes.matches ?? [],
  };
};

export const buildMatchIcs = (match: Match, now: Date): string => {
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
};

export const buildTournamentIcs = (
  tournament: TournamentDetail,
  matches: TournamentMatchListItem[],
  now: Date,
): string => {
  const events = matches.flatMap((match) =>
    isMatchOnCalendar(match) ? (matchToCalendarEvent(match, tournament, now) ?? []) : [],
  );

  return buildIcs({
    name: tournamentStageLabel(tournament),
    dtStamp: now,
    events,
  });
};

export const icsFilename = (prefix: string, id: string): string => {
  const safe = id.replaceAll(/[^a-zA-Z0-9_-]/gu, "").slice(0, 48) || "event";

  return `sarpbc-${prefix}-${safe}.ics`;
};
