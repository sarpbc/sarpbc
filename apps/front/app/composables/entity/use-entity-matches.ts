import type { MaybeRef } from "vue";
import type { ProfileMatchListItem } from "@sarpbc/types";
import { isMatchFinished, isMatchLive, isNonEmptyString } from "@sarpbc/utils";
import { getPlayerMatches } from "~/composables/player/api";
import { getTeamMatches } from "~/composables/team/api";
import type { EntityKind, EntityMatchSections } from "~/types/entity";
import { byBeginAtAsc, byEndAtDesc, PAST_ENTRIES_LIMIT } from "./entity-sort";

const LIVE_STATUSES = new Set(["running", "live", "in_progress"]);

const FETCH_MATCHES = {
  team: getTeamMatches,
  player: getPlayerMatches,
} satisfies Record<EntityKind, (id: string) => Promise<ProfileMatchListItem[]>>;

function isLive(match: ProfileMatchListItem, now: number): boolean {
  return (
    (isNonEmptyString(match.status) && LIVE_STATUSES.has(match.status)) || isMatchLive(match, now)
  );
}

function splitMatches(matches: ProfileMatchListItem[], now: number): EntityMatchSections {
  const live: ProfileMatchListItem[] = [];
  const upcoming: ProfileMatchListItem[] = [];
  const past: ProfileMatchListItem[] = [];

  for (const match of matches) {
    if (isMatchFinished(match)) {
      past.push(match);
    } else if (isLive(match, now)) {
      live.push(match);
    } else {
      upcoming.push(match);
    }
  }

  live.sort(byBeginAtAsc);
  upcoming.sort(byBeginAtAsc);
  past.sort(byEndAtDesc);

  return { live, upcoming, past: past.slice(0, PAST_ENTRIES_LIMIT) };
}

export function useEntityMatches(kind: EntityKind, entityId: MaybeRef<string | undefined>) {
  const idRef = toRef(entityId);

  const { data, pending, error, refresh } = useAsyncData(
    () => `${kind}-matches-${idRef.value ?? "unknown"}`,
    async () => ({
      matches: isNonEmptyString(idRef.value) ? await FETCH_MATCHES[kind](idRef.value) : [],
      /** Captured with the fetch so the server and client split matches identically on hydration. */
      fetchedAt: Date.now(),
    }),
    {
      watch: [idRef],
      default: () => ({ matches: [], fetchedAt: 0 }),
    },
  );

  const sections = computed(() =>
    splitMatches(data.value?.matches ?? [], data.value?.fetchedAt ?? 0),
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
