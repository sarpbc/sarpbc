import { isNonEmptyString } from "@sarpbc/utils";
import { SITE_ORIGIN } from "@sarpbc/ui/config";

const absoluteSiteUrl = (trimmed: string) => {
  if (/^https?:\/\//iu.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return `${SITE_ORIGIN}${path}`;
};

export const resolveSiteUrl = (value: string | undefined | null) => {
  const trimmed = value?.trim();

  return isNonEmptyString(trimmed) ? absoluteSiteUrl(trimmed) : undefined;
};
