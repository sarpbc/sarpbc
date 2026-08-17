import type { Team } from "~/types/team";
import type { Tournament } from "~/types/tournament";
import { SITE_ORIGIN } from "~/utils/calendar/ics";
import { formatPrizepool } from "~/utils/currencyFormatter";
import { getTournamentStatus, type TournamentStatus } from "~/utils/tournamentStatus";
import { compactJsonLd, SCHEMA_ORG, type JsonLdNode } from "./jsonLd";

export const ROCKET_LEAGUE_SPORT = "Rocket League";

const TOURNAMENT_FORMATS = ["online", "offline", "online/offline"] as const;

type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

const FORMAT_LABEL = {
  online: "Online",
  offline: "LAN",
  "online/offline": "Online & LAN",
} as const satisfies Record<TournamentFormat, string>;

export interface SportsOrganizationLd extends JsonLdNode {
  "@type": "SportsOrganization";
  name: string;
  url?: string;
}

export interface SportsTeamLd extends JsonLdNode {
  "@type": "SportsTeam";
  name: string;
  url?: string;
}

export interface VirtualLocationLd extends JsonLdNode {
  "@type": "VirtualLocation";
  url: string;
}

export interface PlaceLd extends JsonLdNode {
  "@type": "Place";
  name: string;
}

export interface PropertyValueLd extends JsonLdNode {
  "@type": "PropertyValue";
  name: string;
  value: string;
}

export type SportsEventLocationLd =
  | VirtualLocationLd
  | PlaceLd
  | Array<VirtualLocationLd | PlaceLd>;

export interface SportsEventLd extends JsonLdNode {
  "@type": "SportsEvent";
  url: string;
  name: string;
  sport: string;
  startDate?: string;
  endDate?: string;
  eventStatus?: string;
  eventAttendanceMode?: string;
  location?: SportsEventLocationLd;
  organizer?: SportsOrganizationLd;
  image?: string;
  description?: string;
  award?: string;
  competitor?: SportsTeamLd[];
  additionalProperty?: PropertyValueLd[];
}

export interface BuildTournamentSportsEventOptions {
  includeContext?: boolean;
  includeCompetitors?: boolean;
  origin?: string;
  now?: number;
}

function isTournamentFormat(value: string): value is TournamentFormat {
  return (TOURNAMENT_FORMATS as readonly string[]).includes(value);
}

export function tournamentCanonicalUrl(id: string, origin = SITE_ORIGIN): string {
  return `${origin}/tournaments/${id}`;
}

export function tournamentDisplayName(tournament: Pick<Tournament, "name" | "league">): string {
  return [tournament.league?.name, tournament.name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

export function resolveStructuredDataUrl(
  value: string | undefined | null,
  origin = SITE_ORIGIN,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${origin}${path}`;
}

export function toIsoDate(value: Date | string | undefined | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export function sportsEventStatusUrl(status: TournamentStatus | null): string | undefined {
  if (status === null) {
    return undefined;
  }

  switch (status) {
    case "upcoming":
    case "live":
    case "finished":
      return `${SCHEMA_ORG}/EventScheduled`;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function eventAttendanceModeUrl(type: string | undefined): string | undefined {
  if (!type || !isTournamentFormat(type)) {
    return undefined;
  }

  switch (type) {
    case "online":
      return `${SCHEMA_ORG}/OnlineEventAttendanceMode`;
    case "offline":
      return `${SCHEMA_ORG}/OfflineEventAttendanceMode`;
    case "online/offline":
      return `${SCHEMA_ORG}/MixedEventAttendanceMode`;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function formatLabel(type: string | undefined): string | undefined {
  if (!type || !isTournamentFormat(type)) {
    return undefined;
  }

  switch (type) {
    case "online":
    case "offline":
    case "online/offline":
      return FORMAT_LABEL[type];
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function virtualLocation(url: string): VirtualLocationLd {
  return { "@type": "VirtualLocation", url };
}

function lanPlace(): PlaceLd {
  return { "@type": "Place", name: "LAN" };
}

export function eventLocation(type: string | undefined, url: string): SportsEventLocationLd {
  if (!type || !isTournamentFormat(type)) {
    return virtualLocation(url);
  }

  switch (type) {
    case "online":
      return virtualLocation(url);
    case "offline":
      return lanPlace();
    case "online/offline":
      return [virtualLocation(url), lanPlace()];
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function getTournamentChampionTeam(tournament: Pick<Tournament, "winner">): Team | null {
  const winner = tournament.winner;
  if (!winner) {
    return null;
  }

  const record = Object(winner) as { team?: Team };
  if (!("team" in record) || !record.team?.slug) {
    return null;
  }

  return record.team;
}

function competitorFromTournament(
  tournament: Pick<Tournament, "participants">,
  origin: string,
): SportsTeamLd[] | undefined {
  const teams = new Map<string, SportsTeamLd>();

  for (const participant of tournament.participants ?? []) {
    const team = participant.team;
    if (!team?.slug || teams.has(team.id)) {
      continue;
    }

    teams.set(
      team.id,
      compactJsonLd({
        "@type": "SportsTeam",
        name: team.name,
        url: `${origin}/team/${team.slug}`,
      }),
    );
  }

  if (teams.size === 0) {
    return undefined;
  }

  return [...teams.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function additionalProperties(
  prizepool: string | undefined,
  format: string | undefined,
): PropertyValueLd[] | undefined {
  const properties: PropertyValueLd[] = [];

  if (prizepool) {
    properties.push({
      "@type": "PropertyValue",
      name: "Prize pool",
      value: prizepool,
    });
  }

  if (format) {
    properties.push({
      "@type": "PropertyValue",
      name: "Format",
      value: format,
    });
  }

  return properties.length > 0 ? properties : undefined;
}

function buildDescription(parts: {
  leagueName?: string;
  format?: string;
  prizepool?: string;
  championName?: string;
  status: TournamentStatus | null;
}): string {
  const sentences: string[] = [];
  const leagueSuffix = parts.leagueName ? ` (${parts.leagueName})` : "";
  sentences.push(`Rocket League tournament${leagueSuffix}`);

  if (parts.status === "finished") {
    sentences.push("This event has finished");
  } else if (parts.status === "live") {
    sentences.push("This event is live");
  }

  if (parts.format) {
    sentences.push(`Format: ${parts.format}`);
  }
  if (parts.prizepool) {
    sentences.push(`Prize pool: ${parts.prizepool}`);
  }
  if (parts.championName) {
    sentences.push(`Champion: ${parts.championName}`);
  }

  return `${sentences.join(". ")}.`;
}

export function buildTournamentSportsEvent(
  tournament: Tournament,
  options: BuildTournamentSportsEventOptions = {},
): SportsEventLd {
  const origin = options.origin ?? SITE_ORIGIN;
  const url = tournamentCanonicalUrl(tournament.id, origin);
  const status = getTournamentStatus(tournament, options.now);
  const prizepool = formatPrizepool(tournament.prizepool) || undefined;
  const format = formatLabel(tournament.type);
  const champion = getTournamentChampionTeam(tournament);
  const image =
    resolveStructuredDataUrl(tournament.imageUrl, origin) ??
    resolveStructuredDataUrl(tournament.league?.imageUrl, origin);
  const organizerName = tournament.league?.name?.trim();

  const event = compactJsonLd<SportsEventLd>({
    "@type": "SportsEvent",
    "@id": url,
    url,
    name: tournamentDisplayName(tournament),
    sport: ROCKET_LEAGUE_SPORT,
    startDate: toIsoDate(tournament.beginAt),
    endDate: toIsoDate(tournament.endAt),
    eventStatus: sportsEventStatusUrl(status),
    eventAttendanceMode: eventAttendanceModeUrl(tournament.type),
    location: eventLocation(tournament.type, url),
    organizer: organizerName
      ? compactJsonLd({
          "@type": "SportsOrganization",
          name: organizerName,
          url: resolveStructuredDataUrl(tournament.league?.url, origin),
        })
      : undefined,
    image,
    description: buildDescription({
      leagueName: organizerName,
      format,
      prizepool,
      championName: champion?.name,
      status,
    }),
    award: prizepool,
    competitor: options.includeCompetitors
      ? competitorFromTournament(tournament, origin)
      : undefined,
    additionalProperty: additionalProperties(prizepool, format),
  });

  if (options.includeContext) {
    event["@context"] = SCHEMA_ORG;
  }

  return event;
}
