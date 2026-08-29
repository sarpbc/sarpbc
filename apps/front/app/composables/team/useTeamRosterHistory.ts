import type { MaybeRef } from "vue";
import type { ContractRole, TeamContract } from "~/types/contract";
import { getTeamContracts } from "~/composables/team/api";

interface TeamRosterHistoryPayload {
  contracts: TeamContract[];
  /** Captured with the fetch so server and client build eras identically on hydration. */
  fetchedAt: number;
}

export interface TeamRosterEraMember {
  contractId: string;
  playerId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  role: ContractRole;
}

export interface TeamRosterEra {
  id: string;
  start: string;
  end: string | null;
  isCurrent: boolean;
  members: TeamRosterEraMember[];
  joined: TeamRosterEraMember[];
  left: TeamRosterEraMember[];
}

interface NormalizedContract {
  contract: TeamContract;
  startMs: number;
  endMs: number | null;
}

function toMember(contract: TeamContract): TeamRosterEraMember {
  return {
    contractId: contract.id,
    playerId: contract.player.id,
    name: contract.player.name,
    slug: contract.player.slug,
    imageUrl: contract.player.imageUrl,
    role: contract.role,
  };
}

function roleRank(role: ContractRole): number {
  switch (role) {
    case "active":
      return 0;
    case "benched":
      return 1;
    case "loaned":
      return 2;
    default: {
      const exhaustive: never = role;
      return exhaustive;
    }
  }
}

function sortMembers(members: TeamRosterEraMember[]): TeamRosterEraMember[] {
  return [...members].sort((a, b) => {
    const roleDiff = roleRank(a.role) - roleRank(b.role);
    if (roleDiff !== 0) return roleDiff;
    return a.name.localeCompare(b.name, "en");
  });
}

function normalizeContracts(contracts: TeamContract[], now: number): NormalizedContract[] {
  const result: NormalizedContract[] = [];

  for (const contract of contracts) {
    const startMs = new Date(contract.startDate).getTime();
    if (Number.isNaN(startMs) || startMs > now) {
      continue;
    }

    let endMs: number | null = contract.endDate ? new Date(contract.endDate).getTime() : null;
    if (endMs !== null && Number.isNaN(endMs)) {
      endMs = null;
    }
    if (endMs !== null && endMs < startMs) {
      endMs = startMs;
    }

    result.push({ contract, startMs, endMs });
  }

  return result;
}

function getMembersAt(normalized: NormalizedContract[], timeMs: number): TeamRosterEraMember[] {
  const members: TeamRosterEraMember[] = [];
  const seen = new Set<string>();

  for (const { contract, startMs, endMs } of normalized) {
    if (startMs > timeMs) continue;
    if (endMs !== null) {
      if (endMs < timeMs) continue;
      if (endMs === timeMs && endMs !== startMs) continue;
    }
    if (seen.has(contract.player.id)) continue;

    seen.add(contract.player.id);
    members.push(toMember(contract));
  }

  return members;
}

function sameRoster(a: TeamRosterEraMember[], b: TeamRosterEraMember[]): boolean {
  if (a.length !== b.length) return false;

  const byPlayerId = (members: TeamRosterEraMember[]) =>
    [...members].sort((left, right) => left.playerId.localeCompare(right.playerId));

  const sortedA = byPlayerId(a);
  const sortedB = byPlayerId(b);

  return sortedA.every(
    (member, index) =>
      member.playerId === sortedB[index]?.playerId && member.role === sortedB[index]?.role,
  );
}

interface RosterMemberDiff {
  joined: TeamRosterEraMember[];
  left: TeamRosterEraMember[];
}

function diffMembers(
  previous: TeamRosterEraMember[] | null,
  current: TeamRosterEraMember[],
): RosterMemberDiff {
  if (!previous) {
    return { joined: current, left: [] };
  }

  const previousIds = new Set(previous.map((member) => member.playerId));
  const currentIds = new Set(current.map((member) => member.playerId));

  return {
    joined: current.filter((member) => !previousIds.has(member.playerId)),
    left: previous.filter((member) => !currentIds.has(member.playerId)),
  };
}

function mergeAdjacentEras(
  eras: Array<{
    startMs: number;
    endMs: number | null;
    isCurrent: boolean;
    members: TeamRosterEraMember[];
  }>,
): typeof eras {
  if (eras.length <= 1) return eras;

  const merged: typeof eras = [];

  for (const era of eras) {
    const last = merged.at(-1);
    if (last && sameRoster(last.members, era.members)) {
      last.endMs = era.endMs;
      last.isCurrent = era.isCurrent;
      continue;
    }
    merged.push({ ...era, members: [...era.members] });
  }

  return merged;
}

export function buildTeamRosterEras(contracts: TeamContract[], now: number): TeamRosterEra[] {
  const normalized = normalizeContracts(contracts, now);
  if (normalized.length === 0) return [];

  const boundarySet = new Set<number>();
  for (const { startMs, endMs } of normalized) {
    boundarySet.add(startMs);
    if (endMs !== null) {
      boundarySet.add(endMs);
    }
  }

  const hasOpenContract = normalized.some(({ endMs }) => endMs === null);
  if (hasOpenContract) {
    boundarySet.add(now);
  }

  const boundaries = [...boundarySet].sort((left, right) => left - right);
  const rawEras: Array<{
    startMs: number;
    endMs: number | null;
    isCurrent: boolean;
    members: TeamRosterEraMember[];
  }> = [];

  for (let index = 0; index < boundaries.length; index++) {
    const startMs = boundaries[index]!;
    const members = getMembersAt(normalized, startMs);
    if (members.length === 0) continue;

    const isLast = index === boundaries.length - 1;
    let endMs: number | null;
    let isCurrent = false;

    if (isLast) {
      const memberPlayerIds = new Set(members.map((member) => member.playerId));
      const anyOpenMember = normalized.some(
        ({ contract, endMs: contractEndMs }) =>
          memberPlayerIds.has(contract.player.id) && contractEndMs === null,
      );

      if (anyOpenMember) {
        endMs = null;
        isCurrent = true;
      } else if (boundaries.length === 1) {
        endMs = startMs;
      } else {
        endMs = null;
      }
    } else {
      endMs = boundaries[index + 1] ?? null;
    }

    rawEras.push({ startMs, endMs, isCurrent, members });
  }

  const mergedEras = mergeAdjacentEras(rawEras);
  let previousMembers: TeamRosterEraMember[] | null = null;
  const eras: TeamRosterEra[] = [];

  for (const era of mergedEras) {
    const sortedMembers = sortMembers(era.members);
    const { joined, left } = diffMembers(previousMembers, sortedMembers);
    previousMembers = sortedMembers;

    eras.push({
      id: `${era.startMs}-${era.endMs ?? "now"}`,
      start: new Date(era.startMs).toISOString(),
      end: era.endMs === null ? null : new Date(era.endMs).toISOString(),
      isCurrent: era.isCurrent,
      members: sortedMembers,
      joined: sortMembers(joined),
      left: sortMembers(left),
    });
  }

  return eras.reverse();
}

export function useTeamRosterHistory(teamId: MaybeRef<string | undefined>) {
  const teamIdRef = toRef(teamId);

  const { data, pending, error, refresh } = useAsyncData<TeamRosterHistoryPayload>(
    () => `team-roster-history-${teamIdRef.value ?? "unknown"}`,
    async () => ({
      contracts: teamIdRef.value ? await getTeamContracts(teamIdRef.value) : [],
      fetchedAt: Date.now(),
    }),
    {
      watch: [teamIdRef],
      default: () => ({ contracts: [], fetchedAt: 0 }),
    },
  );

  const eras = computed(() =>
    buildTeamRosterEras(data.value?.contracts ?? [], data.value?.fetchedAt ?? 0),
  );

  return {
    eras,
    pending,
    error,
    refresh,
  };
}
