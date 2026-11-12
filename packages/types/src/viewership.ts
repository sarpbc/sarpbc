export const VIEWERSHIP_SCOPES = ["official", "with_costreams"] as const;

export type ViewershipScope = (typeof VIEWERSHIP_SCOPES)[number];

export interface Viewership {
  peakViewers: number;
  averageViewers: number | null;
  scope: ViewershipScope;
  measuredAt: string | null;
  sourceName: string;
  sourceUrl: string;
}

export interface ViewershipResponse {
  viewership: Viewership | null;
}
