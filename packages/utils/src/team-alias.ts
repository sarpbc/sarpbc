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

const isIsoDay = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }

  const time = Date.parse(`${value}T00:00:00Z`);

  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
};

const parseUrl = (value: string, protocols: readonly string[]): URL | null => {
  if (value.length > TEAM_ALIAS_URL_MAX_LENGTH || !URL.canParse(value)) {
    return null;
  }

  const url = new URL(value);

  if (!protocols.includes(url.protocol) || url.username || url.password) {
    return null;
  }

  return url;
};

export const parseTeamAlias = (input: TeamAliasInput): ParsedTeamAlias => {
  const name = input.name.trim();

  if (!name) {
    return { error: "missing-name", ok: false };
  }

  if (name.length > TEAM_ALIAS_NAME_MAX_LENGTH) {
    return { error: "name-too-long", ok: false };
  }

  if (!isIsoDay(input.from)) {
    return { error: "invalid-from", ok: false };
  }

  if (input.to !== null && !isIsoDay(input.to)) {
    return { error: "invalid-to", ok: false };
  }

  if (input.to !== null && input.to <= input.from) {
    return { error: "to-not-after-from", ok: false };
  }

  const source = parseUrl(input.sourceUrl.trim(), ["https:", "http:"]);

  if (!source) {
    return { error: "invalid-source-url", ok: false };
  }

  if (isForbiddenSourceHost(source.hostname)) {
    return { error: "forbidden-source", ok: false };
  }

  let logoUrl: string | null = null;

  if (input.logoUrl !== null && input.logoUrl.trim()) {
    const logo = parseUrl(input.logoUrl.trim(), ["https:"]);

    if (!logo) {
      return { error: "invalid-logo-url", ok: false };
    }

    if (isLiquipediaSourceHost(logo.hostname)) {
      return { error: "forbidden-logo-source", ok: false };
    }

    logoUrl = logo.href;
  }

  if (
    input.pandascoreId !== null &&
    (!Number.isSafeInteger(input.pandascoreId) || input.pandascoreId <= 0)
  ) {
    return { error: "invalid-pandascore-id", ok: false };
  }

  return {
    alias: {
      from: input.from,
      logoUrl,
      name,
      pandascoreId: input.pandascoreId,
      sourceUrl: source.href,
      to: input.to,
    },
    ok: true,
  };
};

export const teamAliasInForce = <T extends DatedTeamName>(
  aliases: readonly T[],
  day: string,
): T | null => {
  let found: T | null = null;

  for (const alias of aliases) {
    if (alias.from > day || (alias.to !== null && day >= alias.to)) {
      continue;
    }

    if (!found || alias.from > found.from) {
      found = alias;
    }
  }

  return found;
};

export const teamAliasesOverlap = (first: DatedTeamName, second: DatedTeamName): boolean =>
  (second.to === null || first.from < second.to) && (first.to === null || second.from < first.to);
