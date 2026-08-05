import type { MaybeRef } from "vue";
import type { Match, MatchListItem } from "~/types/matches";

const PAST_MATCHES_LIMIT = 10;

const LIVE_STATUSES = new Set(["running", "live", "in_progress"]);

interface TeamMatchesPayload {
  matches: Match[];
  /** Captured with the fetch so the server and client split matches identically on hydration. */
  fetchedAt: number;
}

export interface TeamMatchSections {
  live: MatchListItem[];
  upcoming: MatchListItem[];
  past: MatchListItem[];
}

function toMatchListItem(match: Match): MatchListItem {
  const tournament = match.tournament;
  // An unpopulated relation serializes to its id, so only trust an object here.
  const league = typeof tournament?.league === "object" ? tournament.league : undefined;

  return {
    id: match.id,
    beginAt: match.beginAt ?? null,
    participants: (match.participants ?? []).map((participant) => ({
      id: participant.id,
      team: { name: participant.team?.name ?? "" },
    })),
    results: match.results ?? [],
    tournament: {
      id: tournament?.id ?? "",
      name: tournament?.name ?? "",
      serie: tournament?.serie ?? null,
      league: league ? { id: league.id, name: league.name } : undefined,
    },
  };
}

function timeOf(value: Date | string | null | undefined): number {
  return value ? new Date(value).getTime() : 0;
}

function isPast(match: Match): boolean {
  return Boolean(match.endAt) || match.status === "finished";
}

function isLive(match: Match, now: number): boolean {
  if (match.status && LIVE_STATUSES.has(match.status)) {
    return true;
  }

  return Boolean(match.beginAt) && timeOf(match.beginAt) <= now;
}

export function splitTeamMatches(matches: Match[], now: number): TeamMatchSections {
  const live: Match[] = [];
  const upcoming: Match[] = [];
  const past: Match[] = [];

  for (const match of matches) {
    if (isPast(match)) {
      past.push(match);
    } else if (isLive(match, now)) {
      live.push(match);
    } else {
      upcoming.push(match);
    }
  }

  const byBeginAtAsc = (a: Match, b: Match) => timeOf(a.beginAt) - timeOf(b.beginAt);
  const byEndAtDesc = (a: Match, b: Match) =>
    (timeOf(b.endAt) || timeOf(b.beginAt)) - (timeOf(a.endAt) || timeOf(a.beginAt));

  live.sort(byBeginAtAsc);
  upcoming.sort(byBeginAtAsc);
  past.sort(byEndAtDesc);

  return {
    live: live.map(toMatchListItem),
    upcoming: upcoming.map(toMatchListItem),
    past: past.slice(0, PAST_MATCHES_LIMIT).map(toMatchListItem),
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
