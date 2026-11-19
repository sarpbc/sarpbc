const normalizedHost = (hostname: string) => hostname.toLowerCase().replace(/\.$/u, "");

/** Matches Liquipedia mirrors too, which republish its pages under other domains. */
export const isLiquipediaSourceHost = (hostname: string) =>
  normalizedHost(hostname).includes("liquipedia");

export const isBlastSourceHost = (hostname: string) => {
  const host = normalizedHost(hostname);

  return host === "blast.tv" || host.endsWith(".blast.tv");
};

export const isForbiddenSourceHost = (hostname: string) =>
  isLiquipediaSourceHost(hostname) || isBlastSourceHost(hostname);
