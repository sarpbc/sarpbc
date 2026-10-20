import { matchPath } from "@sarpbc/utils";
import { getAdminUrl, getFrontUrl } from "../../infrastructure/config/secrets";

export function playerUrl(slug: string): string {
  return `${getFrontUrl()}/player/${slug}`;
}

export function teamUrl(slug: string): string {
  return `${getFrontUrl()}/team/${slug}`;
}

export function matchUrl(publicId: number, slug: string): string {
  return `${getFrontUrl()}${matchPath(publicId, slug)}`;
}

export function tournamentUrl(id: string): string {
  return `${getFrontUrl()}/tournaments/${id}`;
}

export function newsUrl(slug: string): string {
  return `${getFrontUrl()}/news/${slug}`;
}

export function adminNewsEditUrl(slug: string): string {
  return `${getAdminUrl()}/news/${slug}`;
}
