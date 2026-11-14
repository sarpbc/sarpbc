import { isNonEmptyString } from "@sarpbc/utils";
import { SITE_ORIGIN } from "@sarpbc/ui/config";

export const resolveSiteUrl = (value: string | undefined | null): string | undefined => {
  const trimmed = value?.trim();

  if (!isNonEmptyString(trimmed)) {
    return undefined;
  }

  if (/^https?:\/\//iu.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return `${SITE_ORIGIN}${path}`;
};
