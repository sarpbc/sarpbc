import type { TournamentDetail } from "@sarpbc/types";
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
import { formatPrizepool } from "~/utils/currency-formatter";
import { resolveSiteUrl } from "~/utils/site-url";
import { getTournamentStatus } from "~/utils/tournament-status";
import type { TournamentStatus } from "~/utils/tournament-status";
import { compactJsonLd, SCHEMA_ORG } from "./json-ld";
import type { JsonLdNode } from "./json-ld";

const ROCKET_LEAGUE_SPORT = "Rocket League";

const TOURNAMENT_FORMATS = ["online", "offline", "online/offline"] as const;

type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

const FORMAT_LABEL = {
  offline: "LAN",
  online: "Online",
  "online/offline": "Online & LAN",
} as const satisfies Record<TournamentFormat, string>;

interface SportsOrganizationLd extends JsonLdNode {
  "@type": "SportsOrganization";
  name: string;
  url?: string;
}

interface SportsTeamLd extends JsonLdNode {
  "@type": "SportsTeam";
  name: string;
  url?: string;
}

interface PersonLd extends JsonLdNode {
  "@type": "Person";
  name: string;
  url?: string;
}

type CompetitorLd = SportsTeamLd | PersonLd;

interface VirtualLocationLd extends JsonLdNode {
  "@type": "VirtualLocation";
  url: string;
}

interface PostalAddressLd extends JsonLdNode {
  "@type": "PostalAddress";
  addressCountry: string;
}

interface PlaceLd extends JsonLdNode {
  "@type": "Place";
  name: string;
  address: PostalAddressLd;
}

interface PropertyValueLd extends JsonLdNode {
  "@type": "PropertyValue";
  name: string;
  value: string;
}

type SportsEventLocationLd = VirtualLocationLd | PlaceLd | (VirtualLocationLd | PlaceLd)[];

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

const isTournamentFormat = (value: string): value is TournamentFormat =>
  TOURNAMENT_FORMATS.some((format) => format === value);

const toIsoDate = (value: Date | string | undefined | null) => {
  const date = isNonEmptyDateInput(value) ? new Date(value) : undefined;

  return date === undefined || Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const sportsEventStatusUrl = (status: TournamentStatus) => {
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
};

const formatLabel = (type: string | null) =>
  isNonEmptyString(type) && isTournamentFormat(type) ? FORMAT_LABEL[type] : undefined;

const virtualLocation = (url: string) =>
  ({ "@type": "VirtualLocation", url }) satisfies VirtualLocationLd;

const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

const countryPlace = (country: string | null | undefined) => {
  const code = country?.trim().toUpperCase();

  return isNonEmptyString(code) && /^[A-Z]{2}$/u.test(code)
    ? ({
        "@type": "Place",
        address: { "@type": "PostalAddress", addressCountry: code },
        name: COUNTRY_NAMES.of(code) ?? code,
      } satisfies PlaceLd)
    : undefined;
};

const onlineVenue = (url: string) => ({
  eventAttendanceMode: `${SCHEMA_ORG}/OnlineEventAttendanceMode`,
  location: virtualLocation(url),
});

// WARNING: Google rejects a VirtualLocation without eventAttendanceMode and a Place without an address, so emit mode and location together.
const eventVenue = (type: string | null, country: string | null | undefined, url: string) => {
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
};

export const getTournamentChampion = (tournament: Pick<TournamentDetail, "winner">) => {
  const { winner } = tournament;

  if (!winner) {
    return null;
  }

  const listed = winner.team ? Boolean(winner.team.slug) : winner.players.length > 0;

  return listed ? winner : null;
};

const competitorFromTournament = (tournament: Pick<TournamentDetail, "participants">) => {
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

  return competitors.size === 0
    ? undefined
    : [...competitors.values()].toSorted((a, b) => a.name.localeCompare(b.name));
};

const additionalProperties = (prizepool: string | undefined, format: string | undefined) => {
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
};

const buildDescription = (parts: {
  leagueName?: string;
  format?: string;
  prizepool?: string;
  championName?: string;
  status: TournamentStatus | null;
}) => {
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
};

export const buildTournamentSportsEvent = (
  tournament: TournamentDetail,
  options: BuildTournamentSportsEventOptions = {},
) => {
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
    "@id": url,
    "@type": "SportsEvent",
    additionalProperty: additionalProperties(prizepool, format),
    award: prizepool,
    competitor: competitors,
    description: buildDescription({
      championName: champion ? participantName(champion) : undefined,
      format,
      leagueName: organizerName,
      prizepool,
      status,
    }),
    endDate: toIsoDate(tournament.endAt),
    eventAttendanceMode: venue.eventAttendanceMode,
    eventStatus: status === null ? undefined : sportsEventStatusUrl(status),
    image,
    location: venue.location,
    name: tournamentStageLabel(tournament),
    organizer: isNonEmptyString(organizerName)
      ? compactJsonLd<SportsOrganizationLd>({
          "@type": "SportsOrganization",
          name: organizerName,
          url: resolveSiteUrl(tournament.league?.url),
        })
      : undefined,
    performer: competitors,
    sport: ROCKET_LEAGUE_SPORT,
    startDate: toIsoDate(tournament.beginAt),
    url,
  });

  if (options.includeContext === true) {
    event["@context"] = SCHEMA_ORG;
  }

  return event;
};
