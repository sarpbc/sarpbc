export const DATA_SOURCES = ["pandascore", "manual", "startgg"] as const;

export type DataSource = (typeof DATA_SOURCES)[number];

/** start.gg terms allow display with credit but forbid redistributing its data. */
export function isRedistributable(source: DataSource): boolean {
  switch (source) {
    case "pandascore":
    case "manual":
      return true;
    case "startgg":
      return false;
    default: {
      const exhaustive: never = source;
      return exhaustive;
    }
  }
}

export function sourceFromUrl(url: string): Exclude<DataSource, "pandascore"> {
  const host = new URL(url).hostname.toLowerCase();
  return host === "start.gg" || host.endsWith(".start.gg") ? "startgg" : "manual";
}
