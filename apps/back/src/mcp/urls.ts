import { getAdminUrl, getFrontUrl } from "src/common/envirronement/secrets";

export function playerUrl(slug: string): string {
  return `${getFrontUrl()}/player/${slug}`;
}

export function teamUrl(slug: string): string {
  return `${getFrontUrl()}/team/${slug}`;
}

export function matchUrl(id: string): string {
  return `${getFrontUrl()}/matches/${id}`;
}

export function tournamentUrl(id: string): string {
  return `${getFrontUrl()}/tournaments/${id}`;
}

export function adminNewsEditUrl(slug: string): string {
  return `${getAdminUrl()}/news/${slug}`;
}
