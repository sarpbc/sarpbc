const PUBLIC_BASE = "https://sarpbc.org";
const ADMIN_BASE = "https://admin.sarpbc.org";

export function playerUrl(slug: string): string {
  return `${PUBLIC_BASE}/player/${slug}`;
}

export function teamUrl(slug: string): string {
  return `${PUBLIC_BASE}/team/${slug}`;
}

export function matchUrl(id: string): string {
  return `${PUBLIC_BASE}/matches/${id}`;
}

export function tournamentUrl(id: string): string {
  return `${PUBLIC_BASE}/tournaments/${id}`;
}

export function adminNewsEditUrl(slug: string): string {
  return `${ADMIN_BASE}/news/${slug}`;
}
