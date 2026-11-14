const TEAM_NOISE = new Set(["team", "esports", "esport", "gaming", "club", "rl", "gg"]);
const MIN_AFFIX_LENGTH = 4;

function tokens(value: string): string[] {
  return value
    .normalize("NFKD")
    .replaceAll(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function normalizeName(value: string): string {
  return tokens(value).join("");
}

/** Tags are glued to in-game names ("KC Vatira", "zen_rl", "BDS.M0nkey M00n"): a player name may be one word of it, or a long enough prefix or suffix. */
export function playerNameMatches(inGameName: string, playerName: string): boolean {
  const inGame = normalizeName(inGameName);
  const player = normalizeName(playerName);

  if (!inGame || !player) return false;

  if (inGame === player) return true;

  if (player.length >= 2 && tokens(inGameName).includes(player)) return true;

  return (
    player.length >= MIN_AFFIX_LENGTH && (inGame.startsWith(player) || inGame.endsWith(player))
  );
}

function initials(parts: string[]): string {
  return parts.map((part) => part[0]).join("");
}

export function teamNameMatches(replayTeamName: string, teamName: string): boolean {
  const replayAll = tokens(replayTeamName);
  const teamAll = tokens(teamName);
  const replayParts = replayAll.filter((part) => !TEAM_NOISE.has(part));
  const teamParts = teamAll.filter((part) => !TEAM_NOISE.has(part));
  const replay = replayParts.join("") || replayAll.join("");
  const team = teamParts.join("") || teamAll.join("");

  if (!replay || !team) return false;

  if (replay === team) return true;

  if (teamParts.length >= 2 && replay === initials(teamParts)) return true;

  if (replayParts.length >= 2 && team === initials(replayParts)) return true;
  const [shorter, longer] = replay.length <= team.length ? [replay, team] : [team, replay];

  return shorter.length >= MIN_AFFIX_LENGTH && longer.includes(shorter);
}
