import type { MatchDetailResponse } from "~/types/matches";
import { getResultParticipantId } from "~/types/matches";

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
  if (!match.results?.length) {
    return null;
  }

  const result = match.results.find(
    (entry) => getResultParticipantId(entry.participant) === participantId,
  );

  return result?.score ?? null;
}

function buildTournamentLabel(match: MatchDetailResponse["match"]): string {
  const league = match.tournament?.league?.name;
  const name = match.tournament?.name;
  if (league && name) {
    return `${league} ${name}`;
  }
  return name ?? "Rocket League";
}

function buildMatchOgSvg(matchDetail: MatchDetailResponse): string {
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
  <text x="600" y="120" fill="#a1a1aa" font-family="system-ui, sans-serif" font-size="28" text-anchor="middle">${escapeXml(tournament)}</text>
  <text x="600" y="290" fill="#fafafa" font-family="system-ui, sans-serif" font-size="56" font-weight="700" text-anchor="middle">${escapeXml(teamAName)}</text>
  <text x="600" y="360" fill="#3b82f6" font-family="ui-monospace, monospace" font-size="44" font-weight="700" text-anchor="middle">${escapeXml(centerLine)}</text>
  <text x="600" y="430" fill="#fafafa" font-family="system-ui, sans-serif" font-size="56" font-weight="700" text-anchor="middle">${escapeXml(teamBName)}</text>
  <text x="600" y="500" fill="#a1a1aa" font-family="system-ui, sans-serif" font-size="24" text-anchor="middle">${escapeXml(statusLine)}</text>
  <text x="600" y="560" fill="#71717a" font-family="system-ui, sans-serif" font-size="22" text-anchor="middle">sarpbc.org</text>
</svg>`;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")?.replace(/\.svg$/, "");
  if (!id) {
    throw createError({ statusCode: 404, statusMessage: "Match not found" });
  }

  const config = useRuntimeConfig();

  let matchDetail: MatchDetailResponse;
  try {
    matchDetail = await $fetch<MatchDetailResponse>(`${config.public.apiBase}/matches/${id}`);
  } catch {
    throw createError({ statusCode: 404, statusMessage: "Match not found" });
  }

  setHeader(event, "Content-Type", "image/svg+xml; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=300");

  return buildMatchOgSvg(matchDetail);
});
