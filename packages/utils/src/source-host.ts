function normalizedHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "");
}

/** Matches Liquipedia mirrors too, which republish its pages under other domains. */
export function isLiquipediaSourceHost(hostname: string): boolean {
  return normalizedHost(hostname).includes("liquipedia");
}

export function isBlastSourceHost(hostname: string): boolean {
  const host = normalizedHost(hostname);

  return host === "blast.tv" || host.endsWith(".blast.tv");
}

export function isForbiddenSourceHost(hostname: string): boolean {
  return isLiquipediaSourceHost(hostname) || isBlastSourceHost(hostname);
}
