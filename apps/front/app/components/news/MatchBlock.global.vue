<script setup lang="ts">
import type { MatchBlockItem, MatchBlockState } from "@sarpbc/types";
import {
  matchPath,
  newsMatchBlockFromAttrs,
  newsMatchBlockKey,
  tournamentStageLabel,
} from "@sarpbc/utils";
import { getMatchParticipantScore } from "~/utils/match-score";

const {
  match = null,
  ids = null,
  tournament = null,
  team = null,
  limit = null,
} = defineProps<{
  match?: string | null;
  ids?: string | null;
  tournament?: string | null;
  team?: string | null;
  limit?: string | number | null;
}>();

const { t, locale } = useI18n();
const localePath = useLocalePath();
const blocks = useNewsMatchBlocks();
const { isConcealed } = useSpoilerFree();

const block = computed(() => newsMatchBlockFromAttrs({ match, ids, tournament, team, limit }));

const items = computed((): MatchBlockItem[] | undefined =>
  block.value ? blocks?.items.value[newsMatchBlockKey(block.value)] : undefined,
);

const pending = computed(
  () => items.value === undefined && block.value !== null && blocks?.status.value === "pending",
);

const withState = (state: MatchBlockState): MatchBlockItem[] =>
  items.value?.filter((item) => item.state === state) ?? [];

const live = computed(() => withState("live"));
const upcoming = computed(() => withState("upcoming"));
const finished = computed(() => withState("finished"));
const startgg = computed(() => items.value?.some((item) => item.startgg) ?? false);

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }),
);

const teamName = (item: MatchBlockItem, index: number): string =>
  slotName(item.participants, index) ?? t("components.match.tbd");

const summary = (item: MatchBlockItem): string => {
  if (
    item.state === "upcoming" ||
    isConcealed({ matchId: item.id, tournamentId: item.tournament.id })
  ) {
    return t("newsTag.matchVersus", { teamA: teamName(item, 0), teamB: teamName(item, 1) });
  }

  const score = (index: number) =>
    getMatchParticipantScore(item.results, item.participants[index]?.id) ?? "–";

  return t("newsTag.matchScore", {
    teamA: teamName(item, 0),
    scoreA: score(0),
    scoreB: score(1),
    teamB: teamName(item, 1),
  });
};

const stateLabel = useMatchStateLabel(t, (beginAt) =>
  t("newsTag.matchUtc", { date: dateFormatter.value.format(beginAt) }),
);
</script>

<template>
  <div
    v-if="pending || items === undefined || items.length > 0"
    class="not-prose my-4 flex w-full min-w-0 flex-col"
    role="group"
    :aria-label="t('newsTag.matches')"
  >
    <SCard v-if="pending" aria-busy="true">
      <SListItem v-for="index in 2" :key="index">
        <div class="flex w-full items-center justify-between gap-3">
          <span class="flex flex-col gap-1.5">
            <USkeleton class="h-3 w-28" />
            <USkeleton class="h-3 w-24" />
          </span>
          <USkeleton class="h-3 w-10" />
        </div>
      </SListItem>
    </SCard>

    <template v-else-if="items?.length">
      <div class="flex w-full flex-col" data-markdown-exclude>
        <MatchListGroup
          v-if="live.length"
          :matches="live"
          variant="live"
          discovery-source="news_article"
        />
        <MatchListGroup
          v-if="upcoming.length"
          :matches="upcoming"
          variant="upcoming"
          discovery-source="news_article"
        />
        <MatchListGroup
          v-if="finished.length"
          :matches="finished"
          variant="result"
          discovery-source="news_article"
        />
      </div>

      <ul class="hidden" data-markdown-only>
        <li v-for="item in items" :key="item.id">
          <a :href="localePath(matchPath(item.publicId, item.slug))">{{ summary(item) }}</a>
          · {{ tournamentStageLabel(item.tournament) }} · {{ stateLabel(item) }}
        </li>
      </ul>

      <p v-if="startgg" class="flex h-row items-center gap-1 pl-2 text-xs text-muted">
        {{ t("newsTag.matchDataBy") }}
        <a
          :href="STARTGG_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-toned transition-none hover:text-highlighted"
          translate="no"
          >start.gg</a
        >
      </p>
    </template>

    <p
      v-else
      class="flex min-h-row items-center border border-separator bg-default px-3 py-2 text-sm text-muted"
    >
      {{ t("newsTag.matchesUnavailable") }}
    </p>
  </div>
</template>
