const normalizedHost = (hostname: string) => hostname.toLowerCase().replace(/\.$/u, "");

/** Matches Liquipedia mirrors too, which republish its pages under other domains. */
export const isLiquipediaSourceHost = (hostname: string) =>
  normalizedHost(hostname).includes("liquipedia");

const isDomainOrSubdomain = (hostname: string, domain: string) => {
  const host = normalizedHost(hostname);

  return host === domain || host.endsWith(`.${domain}`);
};

export const isBlastSourceHost = (hostname: string) => isDomainOrSubdomain(hostname, "blast.tv");

export const isStartggSourceHost = (hostname: string) => isDomainOrSubdomain(hostname, "start.gg");

/** Liquipedia, BLAST.tv and start.gg terms forbid reusing their data, so none is a source. */
export const isForbiddenSourceHost = (hostname: string) =>
  isLiquipediaSourceHost(hostname) || isBlastSourceHost(hostname) || isStartggSourceHost(hostname);
