const DEMONYM_KEY_PREFIX = "nationalities.demonym.";

export function playerNationalityDemonymKey(code: string): string {
  return `${DEMONYM_KEY_PREFIX}${code.trim().toUpperCase()}`;
}

export function resolvePlayerNationalityDemonym(
  nationality: string | undefined | null,
  te: (key: string) => boolean,
  t: (key: string) => string,
): string | null {
  const code = nationality?.trim().toUpperCase();
  if (!code) {
    return null;
  }

  const key = playerNationalityDemonymKey(code);
  if (!te(key)) {
    return null;
  }

  return t(key);
}
