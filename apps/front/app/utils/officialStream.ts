export interface OfficialMatchStream {
  url: string;
  language: string;
  main: boolean;
}

function localeLanguage(locale: string): string {
  return locale.split("-")[0]?.toLowerCase() ?? "";
}

export function pickOfficialStreamUrl(
  streams: OfficialMatchStream[] | undefined,
  locale: string,
): string | null {
  if (!streams || streams.length === 0) {
    return null;
  }

  const language = localeLanguage(locale);
  const byLocale = language
    ? streams.find((stream) => stream.language.toLowerCase() === language)
    : undefined;
  if (byLocale) {
    return byLocale.url;
  }

  const main = streams.find((stream) => stream.main);
  return (main ?? streams[0]).url;
}
