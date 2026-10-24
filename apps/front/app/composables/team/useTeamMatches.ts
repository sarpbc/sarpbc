import type { MaybeRef } from "vue";
import type { ProfileMatchListItem } from "@sarpbc/types";

const PAST_MATCHES_LIMIT = 10;

const LIVE_STATUSES = new Set(["running", "live", "in_progress"]);

interface TeamMatchesPayload {
  matches: ProfileMatchListItem[];
  /** Captured with the fetch so the server and client split matches identically on hydration. */
  fetchedAt: number;
}

export interface TeamMatchSections {
  live: ProfileMatchListItem[];
  upcoming: ProfileMatchListItem[];
  past: ProfileMatchListItem[];
}

function timeOf(value: Date | string | null | undefined): number {
  return value ? new Date(value).getTime() : 0;
}

function isPast(match: ProfileMatchListItem): boolean {
  return Boolean(match.endAt) || match.status === "finished";
}

function isLive(match: ProfileMatchListItem, now: number): boolean {
  if (match.status && LIVE_STATUSES.has(match.status)) {
    return true;
  }

  return Boolean(match.beginAt) && timeOf(match.beginAt) <= now;
}

export function splitTeamMatches(matches: ProfileMatchListItem[], now: number): TeamMatchSections {
  const live: ProfileMatchListItem[] = [];
  const upcoming: ProfileMatchListItem[] = [];
  const past: ProfileMatchListItem[] = [];

  for (const match of matches) {
    if (isPast(match)) {
      past.push(match);
    } else if (isLive(match, now)) {
      live.push(match);
    } else {
      upcoming.push(match);
    }
  }

  const byBeginAtAsc = (a: ProfileMatchListItem, b: ProfileMatchListItem) =>
    timeOf(a.beginAt) - timeOf(b.beginAt);
  const byEndAtDesc = (a: ProfileMatchListItem, b: ProfileMatchListItem) =>
    (timeOf(b.endAt) || timeOf(b.beginAt)) - (timeOf(a.endAt) || timeOf(a.beginAt));

  live.sort(byBeginAtAsc);
  upcoming.sort(byBeginAtAsc);
  past.sort(byEndAtDesc);

  return {
    live,
    upcoming,
    past: past.slice(0, PAST_MATCHES_LIMIT),
  };
}

export function useTeamMatches(teamId: MaybeRef<string | undefined>) {
  const teamIdRef = toRef(teamId);

  const { data, pending, error, refresh } = useAsyncData<TeamMatchesPayload>(
    () => `team-matches-${teamIdRef.value ?? "unknown"}`,
    async () => ({
      matches: teamIdRef.value ? await getTeamMatches(teamIdRef.value) : [],
      fetchedAt: Date.now(),
    }),
    {
      watch: [teamIdRef],
      default: () => ({ matches: [], fetchedAt: 0 }),
    },
  );

  const sections = computed(() =>
    splitTeamMatches(data.value?.matches ?? [], data.value?.fetchedAt ?? 0),
  );

  return {
    live: computed(() => sections.value.live),
    upcoming: computed(() => sections.value.upcoming),
    past: computed(() => sections.value.past),
    pending,
    error,
    refresh,
  };
}
