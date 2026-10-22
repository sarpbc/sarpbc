<script lang="ts" setup>
import { tournamentEventPath, tournamentStagePath } from "@sarpbc/utils";
import type { TournamentTab } from "~/types/tournament";
import { tournamentCalendarPath } from "~/utils/calendar/ics";
import {
  buildTournamentSportsEvent,
  getTournamentChampionTeam,
} from "~/utils/structuredData/tournamentSportsEvent";
import { tournamentStageLabel } from "~/utils/tournamentStageLabel";
import {
  getTournamentTabFromRouteName,
  getTournamentTabTransitionName,
} from "~/utils/tournamentTabRoute";

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const getRouteBaseName = useRouteBaseName();
const { setPageSeo } = useSarpbcSeo();
const { setJsonLd } = useStructuredData();

const segments = computed(() => [route.params.event as string, route.params.stage as string]);

const {
  data: resolved,
  pending,
  error,
  refresh,
} = await useAsyncData(
  () => `tournament-path-${segments.value.join("/")}`,
  () => resolveTournamentPath(segments.value),
  {
    watch: [segments],
    default: () => null,
  },
);

if (resolved.value?.kind !== "stage") {
  throwEntityLoadError(error.value, {
    notFound: t("page.tournaments.id.notFound"),
    failed: t("page.tournaments.id.error"),
  });
}

const activeTab = computed<TournamentTab>(() =>
  getTournamentTabFromRouteName(getRouteBaseName(route)),
);

const { tournament: resolvedStage, tab: resolvedTab } = resolved.value;
const resolvedStagePath = tournamentStagePath(resolvedStage.event.slug, resolvedStage.slug);
const canonicalPath = localePath(
  resolvedTab === "matches" || activeTab.value === "matches"
    ? `${resolvedStagePath}/matches`
    : resolvedStagePath,
);
if (route.path !== canonicalPath) {
  await navigateTo(
    { path: canonicalPath, query: route.query, hash: route.hash },
    { redirectCode: 301, replace: true },
  );
}

const tournament = computed(() =>
  resolved.value?.kind === "stage" ? resolved.value.tournament : null,
);

const stagePath = computed(() =>
  tournament.value ? tournamentStagePath(tournament.value.event.slug, tournament.value.slug) : "",
);

const teamCount = computed(() => tournament.value?.participants?.length ?? 0);

const tabTransitionName = ref("tournament-tab-left");

const tabTransition = computed(() => ({
  name: tabTransitionName.value,
}));

onBeforeRouteUpdate((to, from) => {
  if (to.params.event !== from.params.event || to.params.stage !== from.params.stage) {
    return;
  }

  const nextTransition = getTournamentTabTransitionName(
    getTournamentTabFromRouteName(getRouteBaseName(from)),
    getTournamentTabFromRouteName(getRouteBaseName(to)),
  );
  if (nextTransition) {
    tabTransitionName.value = nextTransition;
  }
});

const title = computed(() =>
  tournament.value
    ? t("page.tournaments.id.seoTitle", {
        tournamentName: tournamentStageLabel(tournament.value),
      })
    : t("page.tournaments.id.seoTitleDefault"),
);

const description = computed(() =>
  tournament.value
    ? t("page.tournaments.id.seoDescription", {
        tournamentName: tournamentStageLabel(tournament.value),
      })
    : t("page.tournaments.id.seoDescriptionDefault"),
);

watch(
  [title, description],
  () => {
    setPageSeo({
      title: title.value,
      description: description.value,
    });
  },
  { immediate: true },
);

const tournamentJsonLd = computed(() => {
  if (!tournament.value) {
    return null;
  }

  return buildTournamentSportsEvent(tournament.value, {
    includeContext: true,
  });
});

setJsonLd("ld-json-tournament-detail", tournamentJsonLd);
</script>

<template>
  <SHubPageBody>
    <SCard v-if="pending" class="min-h-row-stack" aria-live="polite">
      <div class="w-full p-4 animate-pulse flex flex-col gap-3 items-center">
        <div class="h-3 w-32 rounded bg-elevated" />
        <div class="h-8 w-full max-w-md rounded bg-elevated" />
        <div class="h-3 w-48 rounded bg-elevated" />
      </div>
    </SCard>

    <SCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.tournaments.id.error')" @retry="refresh()" />
    </SCard>

    <template v-else-if="tournament">
      <TournamentHero
        :title="tournament.name"
        :logo-url="tournament.imageUrl?.trim() || tournament.league?.imageUrl"
        :begin-at="tournament.beginAt"
        :end-at="tournament.endAt"
        :prizepool="tournament.prizepool"
        :type="tournament.type"
        :count-label="
          teamCount > 0 ? t('page.tournaments.id.hero.teamsCount', { count: teamCount }) : null
        "
        :champion="getTournamentChampionTeam(tournament)"
        :calendar-path="tournamentCalendarPath(tournament.id)"
      >
        <template #kicker>
          <SLink
            :to="localePath(tournamentEventPath(tournament.event.slug))"
            variant="muted"
            class="text-sm text-pretty"
          >
            {{ tournament.event.name }}
          </SLink>
        </template>
        <TournamentHeader :stage-path="stagePath" :active-tab="activeTab" />
      </TournamentHero>
      <div class="tournament-tab-outlet overflow-hidden">
        <NuxtPage :transition="tabTransition" :tournament="tournament" />
      </div>
    </template>
  </SHubPageBody>
</template>

<style>
.tournament-tab-outlet {
  display: grid;
  grid-template-columns: 1fr;
}

.tournament-tab-outlet > * {
  grid-area: 1 / 1;
  min-width: 0;
}

.tournament-tab-left-enter-active,
.tournament-tab-left-leave-active,
.tournament-tab-right-enter-active,
.tournament-tab-right-leave-active {
  transition:
    transform var(--duration-normal) var(--ease-emphasized),
    opacity var(--duration-normal) var(--ease-emphasized);
}

.tournament-tab-left-enter-from {
  opacity: 0;
  transform: translateX(1.5rem);
}

.tournament-tab-left-leave-to {
  opacity: 0;
  transform: translateX(-1.5rem);
}

.tournament-tab-right-enter-from {
  opacity: 0;
  transform: translateX(-1.5rem);
}

.tournament-tab-right-leave-to {
  opacity: 0;
  transform: translateX(1.5rem);
}

@media (prefers-reduced-motion: reduce) {
  .tournament-tab-left-enter-active,
  .tournament-tab-left-leave-active,
  .tournament-tab-right-enter-active,
  .tournament-tab-right-leave-active {
    transition: opacity var(--duration-fast) ease;
  }

  .tournament-tab-left-enter-from,
  .tournament-tab-left-leave-to,
  .tournament-tab-right-enter-from,
  .tournament-tab-right-leave-to {
    transform: none;
  }
}
</style>
