import { isNonEmptyString } from "@sarpbc/utils";

const DEMONYM_KEY_PREFIX = "nationalities.demonym.";

export const playerNationalityDemonymKey = (code: string): string =>
  `${DEMONYM_KEY_PREFIX}${code.trim().toUpperCase()}`;

export const resolvePlayerNationalityDemonym = (
  nationality: string | undefined | null,
  te: (key: string) => boolean,
  t: (key: string) => string,
): string | null => {
  const code = nationality?.trim().toUpperCase();

  if (!isNonEmptyString(code)) {
    return null;
  }

  const key = playerNationalityDemonymKey(code);

  if (!te(key)) {
    return null;
  }

  return t(key);
};
