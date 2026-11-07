import {
  matchPath,
  newsPath,
  playerPath,
  teamPath,
  tournamentEventPath,
  tournamentStagePath,
} from "@sarpbc/utils";
import { adminUrl, frontUrl } from "../../infrastructure/config/env.validation";

export function playerUrl(slug: string): string {
  return `${frontUrl()}${playerPath(slug)}`;
}

export function teamUrl(slug: string): string {
  return `${frontUrl()}${teamPath(slug)}`;
}

export function matchUrl(publicId: number, slug: string): string {
  return `${frontUrl()}${matchPath(publicId, slug)}`;
}

export function tournamentUrl(tournament: { slug: string; event: { slug: string } }): string {
  return `${frontUrl()}${tournamentStagePath(tournament.event.slug, tournament.slug)}`;
}

export function eventUrl(slug: string): string {
  return `${frontUrl()}${tournamentEventPath(slug)}`;
}

export function newsUrl(slug: string): string {
  return `${frontUrl()}${newsPath(slug)}`;
}

export function adminNewsEditUrl(slug: string): string {
  return `${adminUrl()}/news/${slug}`;
}

export function adminRosterProposalsUrl(): string {
  return `${adminUrl()}/proposals`;
}
