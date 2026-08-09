export const TOURNAMENT_SOURCES = ["pandascore", "manual"] as const;

export type TournamentSource = (typeof TOURNAMENT_SOURCES)[number];

export function isTournamentSource(value: string): value is TournamentSource {
  return (TOURNAMENT_SOURCES as readonly string[]).includes(value);
}

export function assertManualTournamentSource(source: TournamentSource, action: string): void {
  if (source !== "manual") {
    throw new Error(
      `Cannot ${action} a PandaScore-synced tournament. Only manual tournaments can be edited this way.`,
    );
  }
}
