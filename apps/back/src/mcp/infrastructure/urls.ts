import {
  circuitPath,
  matchPath,
  newsPath,
  playerPath,
  teamPath,
  tournamentEventPath,
  tournamentStagePath,
} from "@sarpbc/utils";
import { adminUrl, frontUrl } from "../../infrastructure/config/env.validation";

export const playerUrl = (slug: string): string => `${frontUrl()}${playerPath(slug)}`;

export const teamUrl = (slug: string): string => `${frontUrl()}${teamPath(slug)}`;

export const matchUrl = (publicId: number, slug: string): string =>
  `${frontUrl()}${matchPath(publicId, slug)}`;

export const tournamentUrl = (tournament: { slug: string; event: { slug: string } }): string =>
  `${frontUrl()}${tournamentStagePath(tournament.event.slug, tournament.slug)}`;

export const eventUrl = (slug: string): string => `${frontUrl()}${tournamentEventPath(slug)}`;

export const circuitUrl = (slug: string): string => `${frontUrl()}${circuitPath(slug)}`;

export const newsUrl = (slug: string): string => `${frontUrl()}${newsPath(slug)}`;

export const adminNewsEditUrl = (slug: string): string => `${adminUrl()}/news/${slug}`;

export const adminRosterProposalsUrl = (): string => `${adminUrl()}/proposals`;
