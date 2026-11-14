import type { TeamLogoVariant } from "@sarpbc/types";
import { isLiquipediaSourceHost } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

export type TeamLogoFormat = "png" | "webp" | "svg";

export const MAX_TEAM_LOGO_BYTES = 2 * 1024 * 1024;
export const MIN_TEAM_LOGO_PIXELS = 128;
export const TEAM_LOGO_PIXELS = 512;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const UNSAFE_SVG_PATTERNS: [RegExp, string][] = [
  [/<!DOCTYPE|<!ENTITY/iu, "a DOCTYPE or entity declaration"],
  [/<script[\s>/]/iu, "a script element"],
  [/<foreignObject[\s>/]/iu, "a foreignObject element"],
  [/<(?:iframe|embed|object|audio|video)[\s>/]/iu, "an embedded element"],
  [/\son[a-z]+\s*=/iu, "an event handler attribute"],
  [/javascript:/iu, "a javascript: URL"],
  [
    /(?:href|src)\s*=\s*(?!["']?\s*(?:#|data:image\/(?:png|jpeg|webp|gif)[;,]))/iu,
    "an external reference",
  ],
  [/url\(\s*(?!["']?\s*#)/iu, "an external url() reference"],
  [/@import/iu, "a stylesheet import"],
];

export const teamLogoField = (variant: TeamLogoVariant): "logoLightUrl" | "logoDarkUrl" => {
  switch (variant) {
    case "light": {
      return "logoLightUrl";
    }

    case "dark": {
      return "logoDarkUrl";
    }

    default: {
      const exhaustive: never = variant;

      return exhaustive;
    }
  }
};

const PENDING_TEAM_LOGO_PREFIX = "pending/";

export const pendingTeamLogoKey = (
  teamId: string,
  variant: TeamLogoVariant,
  hash: string,
): string => `${PENDING_TEAM_LOGO_PREFIX}teams/${teamId}/logo-${variant}-${hash}.webp`;

export const requirePendingTeamLogoKey = (key: string): void => {
  if (!key.startsWith(`${PENDING_TEAM_LOGO_PREFIX}teams/`)) {
    throw new InvalidInputError(`"${key}" is not a pending team logo.`);
  }
};

export const publishedTeamLogoKey = (pendingKey: string): string => {
  requirePendingTeamLogoKey(pendingKey);

  return pendingKey.slice(PENDING_TEAM_LOGO_PREFIX.length);
};

export const requireTeamLogoUrl = (value: string): URL => {
  if (!URL.canParse(value)) {
    throw new InvalidInputError("The logo imageUrl is not a valid URL.");
  }

  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new InvalidInputError("The logo imageUrl must use https.");
  }

  if (isLiquipediaSourceHost(url.hostname)) {
    throw new InvalidInputError(
      "Liquipedia is not an accepted logo source; use the team's official asset.",
    );
  }

  return url;
};

const skipSvgPrologue = (head: string): string => {
  let rest = head.trimStart();

  if (rest.startsWith("<?xml")) {
    const end = rest.indexOf(">");

    if (end === -1) {
      return rest;
    }

    rest = rest.slice(end + 1).trimStart();
  }

  while (rest.startsWith("<!--")) {
    const end = rest.indexOf("-->", 4);

    if (end === -1) {
      return rest;
    }

    rest = rest.slice(end + 3).trimStart();
  }

  return rest;
};

const ascii = (bytes: Uint8Array, start: number, end: number): string =>
  String.fromCodePoint(...bytes.subarray(start, end));

export const detectTeamLogoFormat = (bytes: Uint8Array): TeamLogoFormat => {
  if (PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    return "png";
  }

  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return "webp";
  }

  const head = new TextDecoder().decode(bytes.subarray(0, 1024));

  if (/^<svg[\s>]/iu.test(skipSvgPrologue(head))) {
    return "svg";
  }

  throw new InvalidInputError("The logo must be a PNG, WebP or SVG image.");
};

export const requireSafeSvg = (bytes: Uint8Array): void => {
  const text = new TextDecoder().decode(bytes);

  for (const [pattern, reason] of UNSAFE_SVG_PATTERNS) {
    if (pattern.test(text)) {
      throw new InvalidInputError(`The SVG logo was rejected because it contains ${reason}.`);
    }
  }
};

export const requireTeamLogoDimensions = (width: number, height: number): void => {
  if (Math.min(width, height) < MIN_TEAM_LOGO_PIXELS) {
    throw new InvalidInputError(
      `The logo is ${width}x${height} pixels; it must be at least ${MIN_TEAM_LOGO_PIXELS}x${MIN_TEAM_LOGO_PIXELS}.`,
    );
  }
};
