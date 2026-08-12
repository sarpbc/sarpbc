import type { CareerRegion, CareerRoster, CareerWorldState } from "~/types/career";
import { ROSTER_SIZE, USER_ROSTER_ID } from "~/types/career";
import type { CareerWorldTeam } from "~/data/career/world";
import { WORLD_TEAMS, getWorldTeamById } from "~/data/career/world";
import { createRng, hashString } from "~/utils/career/rng";
import { clampStat } from "~/utils/career/stats";

const DISPLACE_CLOSE_MARGIN = 3;

const SPARE_GAMERTAGS = [
  "Riptide",
  "Lowtap",
  "Afterburn",
  "Kite",
  "Sable",
  "Driftwood",
  "Pylon",
  "Helix",
  "Nimbus",
  "Cascade",
  "Ember",
  "Glacier",
  "Hawk",
  "Javelin",
  "Lumen",
  "Magma",
  "Nebula",
  "Onyx",
  "Prism",
  "Quill",
  "Raptor",
  "Solstice",
  "Throttle",
  "Umbra",
  "Volt",
  "Warden",
  "Yonder",
  "Zealot",
  "Ballast",
  "Cinder",
] as const;

type DisplacementFate = "swap" | "free_agent" | "leave";

function asRoster(ids: string[]): CareerRoster {
  if (ids.length !== ROSTER_SIZE) {
    throw new Error(`Roster must have ${ROSTER_SIZE} players`);
  }
  return [ids[0]!, ids[1]!, ids[2]!];
}

function cloneWorld(world: CareerWorldState): CareerWorldState {
  const rosters: Record<string, CareerRoster> = {};
  for (const [teamId, roster] of Object.entries(world.rosters)) {
    rosters[teamId] = [roster[0], roster[1], roster[2]];
  }
  const players: CareerWorldState["players"] = {};
  for (const [id, player] of Object.entries(world.players)) {
    players[id] = { ...player };
  }
  return {
    rosters,
    players,
    freeAgentIds: [...world.freeAgentIds],
    nextGeneratedId: world.nextGeneratedId,
  };
}

function emptyCareerWorld(): CareerWorldState {
  return { rosters: {}, players: {}, freeAgentIds: [], nextGeneratedId: 1 };
}

export function getRosterPlayerRating(
  playerId: string,
  world: CareerWorldState,
  userRating: number,
): number {
  if (playerId === USER_ROSTER_ID) return userRating;
  return world.players[playerId]?.rating ?? 50;
}

export function getRosterStrength(
  roster: readonly string[],
  world: CareerWorldState,
  userRating: number,
): number {
  if (roster.length === 0) return 0;
  const sum = roster.reduce(
    (total, playerId) => total + getRosterPlayerRating(playerId, world, userRating),
    0,
  );
  return sum / roster.length;
}

export function createCareerWorld(careerId: string): CareerWorldState {
  const world = emptyCareerWorld();

  for (const team of WORLD_TEAMS) {
    const ids: string[] = [];
    team.players.forEach((name, slot) => {
      const rng = createRng(hashString(`${careerId}:${team.id}:p${slot}`));
      world.players[name] = {
        id: name,
        name,
        rating: clampStat(team.baseStrength + (rng() * 10 - 4)),
        region: team.region,
      };
      ids.push(name);
    });
    world.rosters[team.id] = asRoster(ids);
  }

  const usedNames = new Set(Object.keys(world.players));
  for (let i = 0; i < 8; i++) {
    const name = SPARE_GAMERTAGS[i];
    if (!name || usedNames.has(name)) continue;
    const rng = createRng(hashString(`${careerId}:fa:${i}`));
    const regions: CareerRegion[] = ["na", "eu", "sam", "oce", "mena", "apac", "ssa"];
    const region = regions[i % regions.length]!;
    world.players[name] = {
      id: name,
      name,
      rating: clampStat(54 + rng() * 16),
      region,
    };
    world.freeAgentIds.push(name);
    usedNames.add(name);
  }

  return world;
}

function pickDisplacementFate(rng: () => number, canSwap: boolean): DisplacementFate {
  const roll = rng();
  if (canSwap && roll < 0.5) return "swap";
  if (roll < (canSwap ? 0.8 : 0.7)) return "free_agent";
  return "leave";
}

function pickPlayerToDisplace(
  roster: readonly string[],
  world: CareerWorldState,
  userRating: number,
  rng: () => number,
): string {
  const npcs = roster.filter((id) => id !== USER_ROSTER_ID);
  const sorted = [...npcs].sort(
    (a, b) =>
      getRosterPlayerRating(a, world, userRating) - getRosterPlayerRating(b, world, userRating),
  );
  const worst = sorted[0];
  if (!worst) {
    throw new Error("Cannot displace from an empty NPC roster");
  }
  const floor = getRosterPlayerRating(worst, world, userRating);
  const bottom = sorted.filter(
    (id) => getRosterPlayerRating(id, world, userRating) <= floor + DISPLACE_CLOSE_MARGIN,
  );
  return bottom[Math.floor(rng() * bottom.length)]!;
}

function isSigned(playerId: string, world: CareerWorldState): boolean {
  if (playerId === USER_ROSTER_ID) return true;
  for (const roster of Object.values(world.rosters)) {
    if (roster.includes(playerId)) return true;
  }
  return false;
}

function usedNames(world: CareerWorldState): Set<string> {
  const names = new Set<string>();
  for (const player of Object.values(world.players)) {
    names.add(player.name);
  }
  return names;
}

function generateReplacement(
  world: CareerWorldState,
  region: CareerRegion,
  rating: number,
): string {
  const names = usedNames(world);
  let name = SPARE_GAMERTAGS.find((candidate) => !names.has(candidate));
  if (!name) {
    name = `Prospect${world.nextGeneratedId}`;
  }
  const id = `gen-${world.nextGeneratedId}`;
  world.nextGeneratedId += 1;
  world.players[id] = {
    id,
    name,
    rating: clampStat(rating),
    region,
  };
  return id;
}

function takeReplacement(
  world: CareerWorldState,
  team: CareerWorldTeam,
  userRating: number,
  rng: () => number,
): string {
  const regional = world.freeAgentIds.filter(
    (id) => world.players[id]?.region === team.region && !isSigned(id, world),
  );
  const any = world.freeAgentIds.filter((id) => !isSigned(id, world));
  const pool = regional.length > 0 ? regional : any;

  if (pool.length > 0) {
    const ranked = [...pool].sort(
      (a, b) =>
        getRosterPlayerRating(b, world, userRating) - getRosterPlayerRating(a, world, userRating),
    );
    const top = ranked.slice(0, Math.min(3, ranked.length));
    const picked = top[Math.floor(rng() * top.length)]!;
    world.freeAgentIds = world.freeAgentIds.filter((id) => id !== picked);
    return picked;
  }

  const remaining = (world.rosters[team.id] ?? []).filter((id) => id !== USER_ROSTER_ID);
  const baseline =
    remaining.length > 0 ? getRosterStrength(remaining, world, userRating) : team.baseStrength;
  return generateReplacement(world, team.region, baseline + (rng() * 8 - 6));
}

function releasePlayer(world: CareerWorldState, playerId: string, fate: DisplacementFate): void {
  switch (fate) {
    case "swap":
      break;
    case "free_agent":
      if (!world.freeAgentIds.includes(playerId)) {
        world.freeAgentIds.push(playerId);
      }
      break;
    case "leave":
      delete world.players[playerId];
      world.freeAgentIds = world.freeAgentIds.filter((id) => id !== playerId);
      break;
    default: {
      const _exhaustive: never = fate;
      throw new Error(`Unhandled displacement fate: ${String(_exhaustive)}`);
    }
  }
}

function fillVacancy(
  world: CareerWorldState,
  teamId: string,
  displacedId: string,
  fate: DisplacementFate,
  userRating: number,
  rng: () => number,
): void {
  const team = getWorldTeamById(teamId);
  if (!team) return;

  const remaining = (world.rosters[teamId] ?? []).filter((id) => id !== USER_ROSTER_ID);
  let incoming: string;
  switch (fate) {
    case "swap":
      incoming = displacedId;
      break;
    case "free_agent":
    case "leave":
      incoming = takeReplacement(world, team, userRating, rng);
      break;
    default: {
      const _exhaustive: never = fate;
      throw new Error(`Unhandled displacement fate: ${String(_exhaustive)}`);
    }
  }

  world.rosters[teamId] = asRoster([...remaining, incoming]);
}

/**
 * Put the user on `toTeamId` (exactly 3 slots). If they already have a club,
 * that roster is refilled so it stays at 3.
 */
export function moveUserToTeam(
  world: CareerWorldState,
  toTeamId: string,
  fromTeamId: string | null,
  userRating: number,
  seed: number,
): CareerWorldState {
  const next = cloneWorld(world);
  const destination = next.rosters[toTeamId];
  if (!destination) {
    throw new Error(`Unknown team: ${toTeamId}`);
  }
  if (destination.includes(USER_ROSTER_ID)) {
    return next;
  }

  const rng = createRng(seed);
  const displacedId = pickPlayerToDisplace(destination, next, userRating, rng);
  next.rosters[toTeamId] = asRoster(
    destination.map((id) => (id === displacedId ? USER_ROSTER_ID : id)),
  );

  const canSwap = fromTeamId !== null && fromTeamId !== toTeamId;
  const fate = pickDisplacementFate(rng, canSwap);

  if (canSwap && fromTeamId) {
    releasePlayer(next, displacedId, fate);
    fillVacancy(next, fromTeamId, displacedId, fate, userRating, rng);
  } else {
    const startFate: DisplacementFate = fate === "swap" ? "free_agent" : fate;
    releasePlayer(next, displacedId, startFate);
  }

  return next;
}
