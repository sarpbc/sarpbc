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

export const sendIcs = (event: H3Event, ics: string, filename: string) => {
  setHeader(event, "Content-Type", "text/calendar; charset=utf-8");
  setHeader(event, "Content-Disposition", `inline; filename="${filename}"`);
  setHeader(event, "Cache-Control", "public, max-age=300");

  return ics;
};

export const parseIcsSlug = (pathname: string) => {
  const segment = pathname.split("/").pop() ?? "";
  const match = /^(?<slug>.+)\.ics$/iu.exec(segment);

  return match?.groups?.slug ?? null;
};

export const fetchMatchForCalendar = async (id: string) => {
  try {
    const { match } = await getMatchById(id);

    return match;
  } catch (error) {
    return rethrowApiError(error, {
      badGateway: "Could not load match for calendar",
      notFound: "Match not found",
    });
  }
};

export const fetchTournamentForCalendar = async (id: string) => {
  let tournamentRes: TournamentResponse;
  let matchesRes: TournamentMatchesResponse;

  try {
    [tournamentRes, matchesRes] = await Promise.all([
      apiFetch<TournamentResponse>(`/tournaments/${id}`),
      apiFetch<TournamentMatchesResponse>(`/tournaments/${id}/matches`),
    ]);
  } catch (error) {
    rethrowApiError(error, {
      badGateway: "Could not load tournament for calendar",
      notFound: "Tournament not found",
    });
  }

  if (!tournamentRes.tournament) {
    throw createError({ statusCode: 404, statusMessage: "Tournament not found" });
  }

  return {
    matches: matchesRes.matches ?? [],
    tournament: tournamentRes.tournament,
  };
};

export const buildMatchIcs = (match: Match, now: Date) => {
  const event = matchToCalendarEvent(match, match.tournament, now);

  if (!event) {
    throw createError({ statusCode: 404, statusMessage: "Match has no scheduled time" });
  }

  const feed: CalendarFeed = {
    dtStamp: now,
    events: [event],
    name: event.summary,
  };

  return buildIcs(feed);
};

export const buildTournamentIcs = (
  tournament: TournamentDetail,
  matches: TournamentMatchListItem[],
  now: Date,
) => {
  const events = matches.flatMap((match) =>
    isMatchOnCalendar(match) ? (matchToCalendarEvent(match, tournament, now) ?? []) : [],
  );

  return buildIcs({
    dtStamp: now,
    events,
    name: tournamentStageLabel(tournament),
  });
};

export const icsFilename = (prefix: string, id: string) => {
  const safe = id.replaceAll(/[^a-zA-Z0-9_-]/gu, "").slice(0, 48) || "event";

  return `sarpbc-${prefix}-${safe}.ics`;
};
