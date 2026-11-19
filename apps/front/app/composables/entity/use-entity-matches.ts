import type { MaybeRef } from "vue";
import type { ProfileMatchListItem } from "@sarpbc/types";
import { isMatchFinished, isMatchLive, isNonEmptyString } from "@sarpbc/utils";
import { getPlayerMatches } from "~/composables/player/api";
import { getTeamMatches } from "~/composables/team/api";
import type { EntityKind } from "~/types/entity";
import { byBeginAtAsc, byEndAtDesc, PAST_ENTRIES_LIMIT } from "./entity-sort";

const LIVE_STATUSES = new Set(["running", "live", "in_progress"]);

const FETCH_MATCHES = {
  player: getPlayerMatches,
  team: getTeamMatches,
} satisfies Record<EntityKind, (id: string) => Promise<ProfileMatchListItem[]>>;

const isLive = (match: ProfileMatchListItem, now: number) =>
  (isNonEmptyString(match.status) && LIVE_STATUSES.has(match.status)) || isMatchLive(match, now);

const splitMatches = (matches: ProfileMatchListItem[], now: number) => {
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

  return { live, past: past.slice(0, PAST_ENTRIES_LIMIT), upcoming };
};

export const useEntityMatches = (kind: EntityKind, entityId: MaybeRef<string | undefined>) => {
  const idRef = toRef(entityId);

  const { data, pending, error, refresh } = useAsyncData(
    () => `${kind}-matches-${idRef.value ?? "unknown"}`,
    async () => ({
      // WARNING: fetchedAt is captured with the fetch so server and client build identical results on hydration.
      fetchedAt: Date.now(),
      matches: isNonEmptyString(idRef.value) ? await FETCH_MATCHES[kind](idRef.value) : [],
    }),
    {
      default: () => ({ fetchedAt: 0, matches: [] }),
      watch: [idRef],
    },
  );

  const sections = computed(() =>
    splitMatches(data.value?.matches ?? [], data.value?.fetchedAt ?? 0),
  );

  return {
    error,
    live: computed(() => sections.value.live),
    past: computed(() => sections.value.past),
    pending,
    refresh,
    upcoming: computed(() => sections.value.upcoming),
  };
};
