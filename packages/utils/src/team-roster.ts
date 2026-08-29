/** Rocket League active roster size (excluding staff). */
export const ACTIVE_ROSTER_LIMIT = 3;

/**
 * PandaScore / Liquipedia-style staff roles that should not appear in the
 * active 3-player lineup on team pages.
 */
const TEAM_STAFF_ROLE_PATTERN =
  /^(coach|co-?coach|assistant(\s|-)?coach|head(\s|-)?coach|manager|analyst|staff)$/i;

export function isTeamStaffRole(role: string | null | undefined): boolean {
  if (role == null) return false;
  const normalized = role.trim();
  if (!normalized) return false;
  return TEAM_STAFF_ROLE_PATTERN.test(normalized);
}

export function isActiveRosterPlayer(player: { role?: string | null }): boolean {
  return !isTeamStaffRole(player.role);
}

export function selectActiveRosterPlayers<T extends { role?: string | null }>(
  players: T[],
  limit: number = ACTIVE_ROSTER_LIMIT,
): T[] {
  return players.filter(isActiveRosterPlayer).slice(0, limit);
}
