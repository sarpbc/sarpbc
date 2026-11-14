<script lang="ts" setup>
import { stageMatchesPath, tournamentEventPath, tournamentStagePath } from "@sarpbc/utils";
import type { TournamentDetail } from "@sarpbc/types";
import { getTournamentChampion } from "~/utils/structuredData/tournamentSportsEvent";
import {
  formatTournamentShortDateRange,
  getTournamentStatus,
  tournamentStatusLabelKey,
} from "~/utils/tournamentStatus";

const route = useRoute();
const { t, locale } = useI18n();
const localePath = useLocalePath();
const { setPageSeo } = useSarpbcSeo();

const eventParam = computed(() => String(route.params.event));

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
      const stage = target.tournament;

      return localePath(
        target.tab === "matches"
          ? stageMatchesPath(stage.event.slug, stage.slug)
          : tournamentStagePath(stage.event.slug, stage.slug),
      );
    }

    default: {
      const _exhaustive: never = target;

      return _exhaustive;
    }
  }
});

if (canonicalPath.value && route.path !== canonicalPath.value) {
  await redirectToCanonical(route, canonicalPath.value);
}

const event = computed(() => (resolved.value?.kind === "event" ? resolved.value.event : null));

const statsStages = computed(
  () => event.value?.stages.filter((stage) => stage.source !== "startgg") ?? [],
);

const showStats = computed(() => statsStages.value.length > 0 && route.query.tab === "stats");

const tabItems = computed(() => {
  const path = event.value ? localePath(tournamentEventPath(event.value.slug)) : route.path;

  return [
    { to: path, label: t("common.overview"), active: !showStats.value },
    {
      to: { path, query: { tab: "stats" } },
      label: t("page.tournaments.stats.tab"),
      active: showStats.value,
    },
  ];
});

const champion = computed(() => {
  const finalStage = event.value?.stages[0];

  return finalStage ? getTournamentChampion(finalStage) : null;
});

const stageCount = computed(() => event.value?.stages.length ?? 0);

const watchStreams = computed(() =>
  event.value?.stages.length === 1 ? (event.value.stages[0]?.watchStreams ?? []) : [],
);

function stageMeta(stage: TournamentDetail): string {
  const status = getTournamentStatus(stage);

  return [
    nonDefaultFormatLabel(stage.format),
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
        <SCard class="min-h-row-stack p-2">
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
        :spoiler-tournament-ids="event.stages.map((stage) => stage.id)"
      >
        <STabNav
          v-if="statsStages.length > 0"
          :items="tabItems"
          :ariaLabel="t('page.tournaments.id.sections')"
        />
      </TournamentHero>

      <TournamentEventPlayerStats v-if="showStats" :event-slug="event.slug" :stages="statsStages" />

      <template v-else>
        <section v-if="event.viewership" aria-labelledby="tournament-event-viewership-title">
          <SRail>
            <template #caption>
              <h2 id="tournament-event-viewership-title">
                {{ t("components.viewership.title") }}
              </h2>
            </template>
            <ViewershipStats
              :viewership="event.viewership"
              :startgg="event.stages.every((stage) => stage.source === 'startgg')"
            />
          </SRail>
        </section>

        <section v-if="watchStreams.length > 0" aria-labelledby="tournament-event-watch-title">
          <SRail>
            <template #caption>
              <h2 id="tournament-event-watch-title">
                {{ t("page.match.detail.sections.watch") }}
              </h2>
            </template>
            <StreamList :streams="watchStreams" />
          </SRail>
        </section>

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
            <SCard class="overflow-x-auto p-2">
              <TournamentBracket :tournament="stage" />
            </SCard>
          </SRail>
        </section>
      </template>
    </template>
  </SHubPageBody>
</template>
