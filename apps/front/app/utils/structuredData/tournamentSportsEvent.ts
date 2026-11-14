import type { ParticipantRef, TeamSummary, TournamentDetail } from "@sarpbc/types";
import {
  participantName,
  playerPath,
  teamPath,
  tournamentStageLabel,
  tournamentStagePath,
  isNonEmptyString,
  isNonEmptyDateInput,
} from "@sarpbc/utils";
import { SITE_ORIGIN } from "@sarpbc/ui/config";
import { formatPrizepool } from "~/utils/currencyFormatter";
import { resolveSiteUrl } from "~/utils/siteUrl";
import { getTournamentStatus } from "~/utils/tournamentStatus";
import type { TournamentStatus } from "~/utils/tournamentStatus";
import { compactJsonLd, SCHEMA_ORG } from "./jsonLd";
import type { JsonLdNode } from "./jsonLd";

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

export interface PersonLd extends JsonLdNode {
  "@type": "Person";
  name: string;
  url?: string;
}

export type CompetitorLd = SportsTeamLd | PersonLd;

export interface VirtualLocationLd extends JsonLdNode {
  "@type": "VirtualLocation";
  url: string;
}

export interface PostalAddressLd extends JsonLdNode {
  "@type": "PostalAddress";
  addressCountry: string;
}

export interface PlaceLd extends JsonLdNode {
  "@type": "Place";
  name: string;
  address: PostalAddressLd;
}

export interface PropertyValueLd extends JsonLdNode {
  "@type": "PropertyValue";
  name: string;
  value: string;
}

export type SportsEventLocationLd = VirtualLocationLd | PlaceLd | (VirtualLocationLd | PlaceLd)[];

export interface SportsEventVenueLd {
  eventAttendanceMode: string;
  location: SportsEventLocationLd;
}

export interface SportsEventLd extends JsonLdNode {
  "@type": "SportsEvent";
  url: string;
  name: string;
  sport: string;
  startDate?: string;
  endDate?: string;
  eventStatus?: string;
  eventAttendanceMode: string;
  location: SportsEventLocationLd;
  organizer?: SportsOrganizationLd;
  image?: string;
  description?: string;
  award?: string;
  competitor?: CompetitorLd[];
  performer?: CompetitorLd[];
  additionalProperty?: PropertyValueLd[];
}

export interface BuildTournamentSportsEventOptions {
  includeContext?: boolean;
  now?: number;
}

function isTournamentFormat(value: string): value is TournamentFormat {
  return TOURNAMENT_FORMATS.some((format) => format === value);
}

export function toIsoDate(value: Date | string | undefined | null): string | undefined {
  if (!isNonEmptyDateInput(value)) {
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
    case "finished": {
      return `${SCHEMA_ORG}/EventScheduled`;
    }

    default: {
      const _exhaustive: never = status;

      return _exhaustive;
    }
  }
}

export function formatLabel(type: string | null): string | undefined {
  if (!isNonEmptyString(type) || !isTournamentFormat(type)) {
    return undefined;
  }

  switch (type) {
    case "online":
    case "offline":
    case "online/offline": {
      return FORMAT_LABEL[type];
    }

    default: {
      const _exhaustive: never = type;

      return _exhaustive;
    }
  }
}

function virtualLocation(url: string): VirtualLocationLd {
  return { "@type": "VirtualLocation", url };
}

const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

function countryPlace(country: string | null | undefined): PlaceLd | undefined {
  const code = country?.trim().toUpperCase();

  if (!isNonEmptyString(code) || !/^[A-Z]{2}$/u.test(code)) {
    return undefined;
  }

  return {
    "@type": "Place",
    name: COUNTRY_NAMES.of(code) ?? code,
    address: { "@type": "PostalAddress", addressCountry: code },
  };
}

function onlineVenue(url: string): SportsEventVenueLd {
  return {
    eventAttendanceMode: `${SCHEMA_ORG}/OnlineEventAttendanceMode`,
    location: virtualLocation(url),
  };
}

// Google treats an event without eventAttendanceMode as offline and rejects a
// VirtualLocation there, and it rejects a Place without an address. So the mode
// and location are always emitted together, falling back to the online venue
// (every event is streamed) when no country is known.
export function eventVenue(
  type: string | null,
  country: string | null | undefined,
  url: string,
): SportsEventVenueLd {
  const place = countryPlace(country);

  if (!isNonEmptyString(type) || !isTournamentFormat(type) || !place) {
    return onlineVenue(url);
  }

  switch (type) {
    case "online": {
      return onlineVenue(url);
    }

    case "offline": {
      return {
        eventAttendanceMode: `${SCHEMA_ORG}/OfflineEventAttendanceMode`,
        location: place,
      };
    }

    case "online/offline": {
      return {
        eventAttendanceMode: `${SCHEMA_ORG}/MixedEventAttendanceMode`,
        location: [virtualLocation(url), place],
      };
    }

    default: {
      const _exhaustive: never = type;

      return _exhaustive;
    }
  }
}

export function getTournamentChampion(
  tournament: Pick<TournamentDetail, "winner">,
): ParticipantRef<TeamSummary> | null {
  const { winner } = tournament;

  if (!winner) {
    return null;
  }

  const listed = winner.team ? Boolean(winner.team.slug) : winner.players.length > 0;

  return listed ? winner : null;
}

function competitorFromTournament(
  tournament: Pick<TournamentDetail, "participants">,
): CompetitorLd[] | undefined {
  const competitors = new Map<string, CompetitorLd>();

  for (const participant of tournament.participants) {
    const { team } = participant;

    if (!team) {
      for (const player of participant.players) {
        competitors.set(
          player.id,
          compactJsonLd<PersonLd>({
            "@type": "Person",
            name: player.name,
            url: `${SITE_ORIGIN}${playerPath(player.slug)}`,
          }),
        );
      }

      continue;
    }

    const name = team.name.trim();

    if (!name || competitors.has(team.id)) {
      continue;
    }

    competitors.set(
      team.id,
      compactJsonLd<SportsTeamLd>({
        "@type": "SportsTeam",
        name,
        url: team.slug ? `${SITE_ORIGIN}${teamPath(team.slug)}` : undefined,
      }),
    );
  }

  if (competitors.size === 0) {
    return undefined;
  }

  return [...competitors.values()].toSorted((a, b) => a.name.localeCompare(b.name));
}

function additionalProperties(
  prizepool: string | undefined,
  format: string | undefined,
): PropertyValueLd[] | undefined {
  const properties: PropertyValueLd[] = [];

  if (isNonEmptyString(prizepool)) {
    properties.push({
      "@type": "PropertyValue",
      name: "Prize pool",
      value: prizepool,
    });
  }

  if (isNonEmptyString(format)) {
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
  const leagueSuffix = isNonEmptyString(parts.leagueName) ? ` (${parts.leagueName})` : "";
  sentences.push(`Rocket League tournament${leagueSuffix}`);

  if (parts.status === "finished") {
    sentences.push("This event has finished");
  } else if (parts.status === "live") {
    sentences.push("This event is live");
  }

  if (isNonEmptyString(parts.format)) {
    sentences.push(`Format: ${parts.format}`);
  }

  if (isNonEmptyString(parts.prizepool)) {
    sentences.push(`Prize pool: ${parts.prizepool}`);
  }

  if (isNonEmptyString(parts.championName)) {
    sentences.push(`Champion: ${parts.championName}`);
  }

  return `${sentences.join(". ")}.`;
}

export function buildTournamentSportsEvent(
  tournament: TournamentDetail,
  options: BuildTournamentSportsEventOptions = {},
): SportsEventLd {
  const url = `${SITE_ORIGIN}${tournamentStagePath(tournament.event.slug, tournament.slug)}`;
  const status = getTournamentStatus(tournament, options.now);
  const prizepool = formatPrizepool(tournament.prizepool) || undefined;
  const format = formatLabel(tournament.type);
  const champion = getTournamentChampion(tournament);
  const image = resolveSiteUrl(tournament.imageUrl) ?? resolveSiteUrl(tournament.league?.imageUrl);
  const organizerName = tournament.league?.name?.trim();
  const competitors = competitorFromTournament(tournament);
  const venue = eventVenue(tournament.type, tournament.country, url);

  const event = compactJsonLd<SportsEventLd>({
    "@type": "SportsEvent",
    "@id": url,
    url,
    name: tournamentStageLabel(tournament),
    sport: ROCKET_LEAGUE_SPORT,
    startDate: toIsoDate(tournament.beginAt),
    endDate: toIsoDate(tournament.endAt),
    eventStatus: sportsEventStatusUrl(status),
    eventAttendanceMode: venue.eventAttendanceMode,
    location: venue.location,
    organizer: isNonEmptyString(organizerName)
      ? compactJsonLd<SportsOrganizationLd>({
          "@type": "SportsOrganization",
          name: organizerName,
          url: resolveSiteUrl(tournament.league?.url),
        })
      : undefined,
    image,
    description: buildDescription({
      leagueName: organizerName,
      format,
      prizepool,
      championName: champion ? participantName(champion) : undefined,
      status,
    }),
    award: prizepool,
    competitor: competitors,
    performer: competitors,
    additionalProperty: additionalProperties(prizepool, format),
  });

  if (options.includeContext === true) {
    event["@context"] = SCHEMA_ORG;
  }

  return event;
}
