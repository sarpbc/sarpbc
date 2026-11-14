const normalizedHost = (hostname: string): string => hostname.toLowerCase().replace(/\.$/u, "");

/** Matches Liquipedia mirrors too, which republish its pages under other domains. */
export const isLiquipediaSourceHost = (hostname: string): boolean =>
  normalizedHost(hostname).includes("liquipedia");

export const isBlastSourceHost = (hostname: string): boolean => {
  const host = normalizedHost(hostname);

  return host === "blast.tv" || host.endsWith(".blast.tv");
};

export const isForbiddenSourceHost = (hostname: string): boolean =>
  isLiquipediaSourceHost(hostname) || isBlastSourceHost(hostname);
