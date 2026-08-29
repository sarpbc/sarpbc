import { existsSync } from "node:fs";
import { join } from "node:path";
import * as z from "zod";
import type { MatchDetailResponse } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";
import { parseMatchResults } from "~/utils/parseMatchResult";

const MATCH_OG_FONT_FAMILY = "Inter";
const MATCH_OG_FONT_FILES = ["Inter-Regular.ttf", "Inter-Bold.ttf"] as const;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

function getMatchStatus(match: MatchDetailResponse["match"]): "live" | "finished" | "upcoming" {
  const now = Date.now();
  const beginAt = match.beginAt ? new Date(match.beginAt).getTime() : null;

  if (match.endAt || match.status === "finished") {
    return "finished";
  }

  if (beginAt !== null && beginAt <= now) {
    return "live";
  }

  return "upcoming";
}

function getParticipantScore(
  match: MatchDetailResponse["match"],
  participantId: string,
): number | null {
  return getMatchParticipantScore(match.results, participantId);
}

function buildTournamentLabel(match: MatchDetailResponse["match"]): string {
  const league = match.tournament?.league?.name;
  const name = match.tournament?.name;
  if (league && name) {
    return `${league} ${name}`;
  }
  return name ?? "Rocket League";
}

export function buildMatchOgSvg(matchDetail: MatchDetailResponse): string {
  const match = matchDetail.match;
  const participants = match.participants ?? [];
  const teamA = participants[0];
  const teamB = participants[1];
  const teamAName = truncate(teamA?.team.name ?? "TBD", 28);
  const teamBName = truncate(teamB?.team.name ?? "TBD", 28);
  const tournament = truncate(buildTournamentLabel(match), 48);
  const status = getMatchStatus(match);

  let centerLine = "vs";
  if (status === "finished" || status === "live") {
    const scoreA = teamA ? getParticipantScore(match, teamA.id) : null;
    const scoreB = teamB ? getParticipantScore(match, teamB.id) : null;
    centerLine = `${scoreA ?? "-"} - ${scoreB ?? "-"}`;
  }

  let statusLine = "Upcoming match";
  if (status === "live") {
    statusLine = "Live now";
  } else if (status === "finished") {
    statusLine = "Final score";
  } else if (match.beginAt) {
    statusLine = new Date(match.beginAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#09090b"/>
      <stop offset="100%" stop-color="#18181b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="48" y="48" width="1104" height="534" rx="24" fill="#18181b" stroke="#27272a"/>
  <text x="600" y="120" fill="#a1a1aa" font-family="${MATCH_OG_FONT_FAMILY}" font-size="28" text-anchor="middle">${escapeXml(tournament)}</text>
  <text x="600" y="290" fill="#fafafa" font-family="${MATCH_OG_FONT_FAMILY}" font-size="56" font-weight="700" text-anchor="middle">${escapeXml(teamAName)}</text>
  <text x="600" y="360" fill="#3b82f6" font-family="${MATCH_OG_FONT_FAMILY}" font-size="44" font-weight="700" text-anchor="middle">${escapeXml(centerLine)}</text>
  <text x="600" y="430" fill="#fafafa" font-family="${MATCH_OG_FONT_FAMILY}" font-size="56" font-weight="700" text-anchor="middle">${escapeXml(teamBName)}</text>
  <text x="600" y="500" fill="#a1a1aa" font-family="${MATCH_OG_FONT_FAMILY}" font-size="24" text-anchor="middle">${escapeXml(statusLine)}</text>
  <text x="600" y="560" fill="#71717a" font-family="${MATCH_OG_FONT_FAMILY}" font-size="22" text-anchor="middle">sarpbc.org</text>
</svg>`;
}

export function resolveMatchOgFontFiles(): string[] {
  const dirs = [
    join(process.cwd(), "public", "fonts", "og"),
    join(process.cwd(), "apps", "front", "public", "fonts", "og"),
  ];

  for (const dir of dirs) {
    const files = MATCH_OG_FONT_FILES.map((name) => join(dir, name));
    if (files.every((file) => existsSync(file))) {
      return files;
    }
  }

  throw new Error(`Match OG fonts missing (looked in: ${dirs.join(", ")})`);
}

export function getMatchOgResvgFontOptions() {
  return {
    fontFiles: resolveMatchOgFontFiles(),
    // Alpine runtime images have no system fonts; Resvg drops <text> when none resolve.
    loadSystemFonts: false,
    defaultFontFamily: MATCH_OG_FONT_FAMILY,
  };
}

const fetchStatusCodeSchema = z.union([
  z.object({ statusCode: z.number() }).transform((value) => value.statusCode),
  z.object({ status: z.number() }).transform((value) => value.status),
  z
    .object({ response: z.object({ status: z.number() }) })
    .transform((value) => value.response.status),
]);

export function getFetchStatusCode(cause: unknown): number | undefined {
  const parsed = fetchStatusCodeSchema.safeParse(cause);
  return parsed.success ? parsed.data : undefined;
}

export async function fetchMatchDetailForOg(id: string): Promise<MatchDetailResponse> {
  const config = useRuntimeConfig();

  try {
    const response = await $fetch<MatchDetailResponse>(`${config.public.apiBase}/matches/${id}`);
    return {
      ...response,
      match: {
        ...response.match,
        results: parseMatchResults(response.match.results),
      },
    };
  } catch (cause) {
    const statusCode = getFetchStatusCode(cause);
    if (statusCode === 404) {
      throw createError({ statusCode: 404, statusMessage: "Match not found" });
    }

    throw createError({
      statusCode: 502,
      statusMessage: "Could not load match for OG image",
      cause,
    });
  }
}
