import type { TeamAliasInput } from "@sarpbc/types";
import { isForbiddenSourceHost, isLiquipediaSourceHost } from "./source-host";

export const TEAM_ALIAS_NAME_MAX_LENGTH = 255;
export const TEAM_ALIAS_URL_MAX_LENGTH = 2048;

export type TeamAliasError =
  | "missing-name"
  | "name-too-long"
  | "invalid-from"
  | "invalid-to"
  | "to-not-after-from"
  | "invalid-source-url"
  | "forbidden-source"
  | "invalid-logo-url"
  | "forbidden-logo-source"
  | "invalid-pandascore-id";

export type ParsedTeamAlias =
  | { ok: true; alias: TeamAliasInput }
  | { ok: false; error: TeamAliasError };

export interface DatedTeamName {
  from: string;
  to: string | null;
}

function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);

  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
}

function parseUrl(value: string, protocols: readonly string[]): URL | null {
  if (value.length > TEAM_ALIAS_URL_MAX_LENGTH || !URL.canParse(value)) return null;
  const url = new URL(value);

  if (!protocols.includes(url.protocol) || url.username || url.password) return null;

  return url;
}

export function parseTeamAlias(input: TeamAliasInput): ParsedTeamAlias {
  const name = input.name.trim();

  if (!name) return { ok: false, error: "missing-name" };

  if (name.length > TEAM_ALIAS_NAME_MAX_LENGTH) return { ok: false, error: "name-too-long" };

  if (!isIsoDay(input.from)) return { ok: false, error: "invalid-from" };

  if (input.to !== null && !isIsoDay(input.to)) return { ok: false, error: "invalid-to" };

  if (input.to !== null && input.to <= input.from) return { ok: false, error: "to-not-after-from" };
  const source = parseUrl(input.sourceUrl.trim(), ["https:", "http:"]);

  if (!source) return { ok: false, error: "invalid-source-url" };

  if (isForbiddenSourceHost(source.hostname)) return { ok: false, error: "forbidden-source" };
  let logoUrl: string | null = null;

  if (input.logoUrl !== null && input.logoUrl.trim()) {
    const logo = parseUrl(input.logoUrl.trim(), ["https:"]);

    if (!logo) return { ok: false, error: "invalid-logo-url" };

    if (isLiquipediaSourceHost(logo.hostname)) return { ok: false, error: "forbidden-logo-source" };
    logoUrl = logo.href;
  }

  if (
    input.pandascoreId !== null &&
    (!Number.isSafeInteger(input.pandascoreId) || input.pandascoreId <= 0)
  )
    return { ok: false, error: "invalid-pandascore-id" };

  return {
    ok: true,
    alias: {
      name,
      from: input.from,
      to: input.to,
      sourceUrl: source.href,
      logoUrl,
      pandascoreId: input.pandascoreId,
    },
  };
}

export function teamAliasInForce<T extends DatedTeamName>(
  aliases: readonly T[],
  day: string,
): T | null {
  let found: T | null = null;

  for (const alias of aliases) {
    if (alias.from > day || (alias.to !== null && day >= alias.to)) continue;

    if (!found || alias.from > found.from) found = alias;
  }

  return found;
}

export function teamAliasesOverlap(first: DatedTeamName, second: DatedTeamName): boolean {
  return (
    (second.to === null || first.from < second.to) && (first.to === null || second.from < first.to)
  );
}
