import { SITE_ORIGIN } from "@sarpbc/ui/config";

export function resolveSiteUrl(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${SITE_ORIGIN}${path}`;
}
