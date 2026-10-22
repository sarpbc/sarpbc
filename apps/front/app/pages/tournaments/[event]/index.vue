<script lang="ts" setup>
import { tournamentEventPath, tournamentStagePath } from "@sarpbc/utils";
import type { Tournament } from "~/types/tournament";
import { getTournamentChampionTeam } from "~/utils/structuredData/tournamentSportsEvent";
import {
  formatTournamentShortDateRange,
  getTournamentStatus,
  tournamentStatusLabelKey,
} from "~/utils/tournamentStatus";

const route = useRoute();
const { t, locale } = useI18n();
const localePath = useLocalePath();
const { setPageSeo } = useSarpbcSeo();

const eventParam = computed(() => route.params.event as string);

const {
  data: resolved,
  pending,
  error,
  refresh,
} = await useAsyncData(
  () => `tournament-path-${eventParam.value}`,
  () => resolveTournamentPath([eventParam.value]),
  {
    watch: [eventParam],
    default: () => null,
  },
);

if (!resolved.value) {
  throwEntityLoadError(error.value, {
    notFound: t("page.tournaments.event.notFound"),
    failed: t("page.tournaments.event.error"),
  });
}

const canonicalPath = computed(() => {
  const target = resolved.value;
  if (!target) return null;
  switch (target.kind) {
    case "event":
      return localePath(tournamentEventPath(target.event.slug));
    case "stage": {
      const stagePath = tournamentStagePath(target.tournament.event.slug, target.tournament.slug);
      return localePath(target.tab === "matches" ? `${stagePath}/matches` : stagePath);
    }
    default: {
      const _exhaustive: never = target;
      return _exhaustive;
    }
  }
});

if (canonicalPath.value && route.path !== canonicalPath.value) {
  await navigateTo(
    { path: canonicalPath.value, query: route.query, hash: route.hash },
    { redirectCode: 301, replace: true },
  );
}

const event = computed(() => (resolved.value?.kind === "event" ? resolved.value.event : null));

const champion = computed(() => {
  const finalStage = event.value?.stages[0];
  return finalStage ? getTournamentChampionTeam(finalStage) : null;
});

const stageCount = computed(() => event.value?.stages.length ?? 0);

function stageMeta(stage: Tournament): string {
  const status = getTournamentStatus(stage);
  return [
    formatTournamentShortDateRange(stage.beginAt, stage.endAt, locale.value),
    status ? t(tournamentStatusLabelKey(status)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

watch(
  event,
  (current) => {
    setPageSeo({
      title: current
        ? t("page.tournaments.event.seoTitle", { eventName: current.name })
        : t("page.tournaments.id.seoTitleDefault"),
      description: current
        ? t("page.tournaments.event.seoDescription", { eventName: current.name })
        : t("page.tournaments.id.seoDescriptionDefault"),
    });
  },
  { immediate: true },
);
</script>

<template>
  <SHubPageBody>
    <template v-if="pending">
      <SCard class="min-h-row-stack" aria-live="polite">
        <div class="w-full p-4 animate-pulse flex flex-col gap-3 items-center">
          <div class="h-3 w-32 rounded bg-elevated" />
          <div class="h-8 w-full max-w-md rounded bg-elevated" />
          <div class="h-3 w-48 rounded bg-elevated" />
        </div>
      </SCard>
      <SRail v-for="index in 2" :key="index" caption="section">
        <template #caption>
          <USkeleton class="h-3 w-40" />
        </template>
        <SCard flush-top class="min-h-row-stack p-2">
          <div class="grid grid-cols-2 gap-2 xl:grid-cols-3">
            <USkeleton v-for="cell in 6" :key="cell" class="h-row" />
          </div>
        </SCard>
      </SRail>
    </template>

    <SCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.tournaments.event.error')" @retry="refresh()" />
    </SCard>

    <template v-else-if="event">
      <TournamentHero
        :title="event.name"
        :logo-url="event.logoUrl"
        :league-name="event.league?.name"
        :begin-at="event.beginAt"
        :end-at="event.endAt"
        :prizepool="event.prizepool"
        :type="event.type"
        :count-label="t('page.tournaments.event.stagesCount', { count: stageCount })"
        :champion="champion"
      />

      <section
        v-for="stage in event.stages"
        :key="stage.id"
        :aria-labelledby="`tournament-stage-title-${stage.id}`"
      >
        <SRail caption="section">
          <template #caption>
            <div class="flex w-full min-w-0 items-center gap-2 pr-2">
              <h2 :id="`tournament-stage-title-${stage.id}`" class="min-w-0 flex-1 truncate">
                <SLink
                  :to="localePath(tournamentStagePath(event.slug, stage.slug))"
                  variant="inline"
                >
                  {{ stage.name }}
                </SLink>
              </h2>
              <span
                v-if="stageMeta(stage)"
                class="shrink-0 truncate text-xs font-normal text-muted tabular-nums"
              >
                {{ stageMeta(stage) }}
              </span>
            </div>
          </template>
          <SCard flush-top class="overflow-x-auto p-2">
            <TournamentBracket :tournament="stage" />
          </SCard>
        </SRail>
      </section>
    </template>
  </SHubPageBody>
</template>
