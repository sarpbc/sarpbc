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

export const playerUrl = (slug: string) => `${frontUrl()}${playerPath(slug)}`;

export const teamUrl = (slug: string) => `${frontUrl()}${teamPath(slug)}`;

export const matchUrl = (publicId: number, slug: string) =>
  `${frontUrl()}${matchPath(publicId, slug)}`;

export const tournamentUrl = (tournament: { slug: string; event: { slug: string } }) =>
  `${frontUrl()}${tournamentStagePath(tournament.event.slug, tournament.slug)}`;

export const eventUrl = (slug: string) => `${frontUrl()}${tournamentEventPath(slug)}`;

export const circuitUrl = (slug: string) => `${frontUrl()}${circuitPath(slug)}`;

export const newsUrl = (slug: string) => `${frontUrl()}${newsPath(slug)}`;

export const adminNewsEditUrl = (slug: string) => `${adminUrl()}/news/${slug}`;

export const adminRosterProposalsUrl = () => `${adminUrl()}/proposals`;
