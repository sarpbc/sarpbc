<script lang="ts" setup>
import type { TournamentTab } from "@sarpbc/types";
import { tournamentEventPath, tournamentStageLabel } from "@sarpbc/utils";
import { tournamentCalendarPath } from "~/utils/calendar/ics";
import {
  buildTournamentSportsEvent,
  getTournamentChampion,
} from "~/utils/structuredData/tournament-sports-event";
import { getTournamentTabFromRouteName, tournamentTabPath } from "~/utils/tournament-tab-route";

definePageMeta({ viewTransition: false });

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const getRouteBaseName = useRouteBaseName();
const { setPageSeo } = useSarpbcSeo();
const { setJsonLd } = useStructuredData();

// WARNING: keep a string, not the segments array: switching Overview and Matches must not refetch the stage.
const stagePath = computed(() => `${String(route.params.event)}/${String(route.params.stage)}`);

const {
  data: resolved,
  pending,
  error,
  refresh,
} = await useAsyncData(
  () => `tournament-path-${stagePath.value}`,
  () => resolveTournamentPath(stagePath.value.split("/")),
  {
    default: () => null,
    watch: [stagePath],
  },
);

if (resolved.value?.kind !== "stage") {
  throwEntityLoadError(error.value, {
    failed: t("page.tournaments.id.error"),
    notFound: t("page.tournaments.id.notFound"),
  });
}

const activeTab = computed<TournamentTab>(() =>
  getTournamentTabFromRouteName(getRouteBaseName(route)),
);

const { tournament: resolvedStage, tab: resolvedTab } = resolved.value;
const requestedTab = resolvedTab === "overview" ? activeTab.value : resolvedTab;

const canonicalPath = localePath(
  tournamentTabPath(
    requestedTab === "stats" && resolvedStage.source === "startgg" ? "overview" : requestedTab,
    resolvedStage.event.slug,
    resolvedStage.slug,
  ),
);

if (route.path !== canonicalPath) {
  await redirectToCanonical(route, canonicalPath);
}

const tournament = computed(() =>
  resolved.value?.kind === "stage" ? resolved.value.tournament : null,
);

const teamCount = computed(() => tournament.value?.participants?.length ?? 0);

const tabSeoKeys: Record<TournamentTab, { title: string; description: string }> = {
  matches: {
    description: "page.tournaments.id.seoDescriptionMatches",
    title: "page.tournaments.id.seoTitleMatches",
  },
  overview: {
    description: "page.tournaments.id.seoDescription",
    title: "page.tournaments.id.seoTitle",
  },
  stats: {
    description: "page.tournaments.id.seoDescriptionStats",
    title: "page.tournaments.id.seoTitleStats",
  },
};

const title = computed(() =>
  tournament.value
    ? t(tabSeoKeys[activeTab.value].title, {
        tournamentName: tournamentStageLabel(tournament.value),
      })
    : t("page.tournaments.id.seoTitleDefault"),
);

const description = computed(() =>
  tournament.value
    ? t(tabSeoKeys[activeTab.value].description, {
        tournamentName: tournamentStageLabel(tournament.value),
      })
    : t("page.tournaments.id.seoDescriptionDefault"),
);

watch(
  [title, description],
  () => {
    setPageSeo({
      description: description.value,
      title: title.value,
    });
  },
  { immediate: true },
);

const { isConcealed } = useSpoilerFree();

const tournamentJsonLd = computed(() => {
  if (!tournament.value) {
    return null;
  }

  const concealed = isConcealed({ tournamentId: tournament.value.id });

  return buildTournamentSportsEvent(
    concealed ? { ...tournament.value, winner: null } : tournament.value,
    { includeContext: true },
  );
});

setJsonLd("ld-json-tournament-detail", tournamentJsonLd);
</script>

<template>
  <HubPageBody>
    <HubCard v-if="pending" class="min-h-row-stack" aria-live="polite">
      <div class="w-full p-4 animate-pulse flex flex-col gap-3 items-center">
        <div class="h-3 w-32 rounded bg-elevated" />
        <div class="h-8 w-full max-w-md rounded bg-elevated" />
        <div class="h-3 w-48 rounded bg-elevated" />
      </div>
    </HubCard>

    <HubCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.tournaments.id.error')" @retry="refresh()" />
    </HubCard>

    <template v-else-if="tournament">
      <TournamentHero
        :title="tournament.name"
        :logo-url="tournament.imageUrl?.trim() || tournament.league?.imageUrl"
        :begin-at="tournament.beginAt"
        :end-at="tournament.endAt"
        :prizepool="tournament.prizepool"
        :type="tournament.type"
        :count-label="
          teamCount > 0 ? t(participantsCountKey(tournament.format), { count: teamCount }) : null
        "
        :champion="getTournamentChampion(tournament)"
        :format="tournament.format"
        :calendar-path="tournamentCalendarPath(tournament.id)"
        :spoiler-tournament-ids="[tournament.id]"
      >
        <template #kicker>
          <SLink
            :to="localePath(tournamentEventPath(tournament.event.slug))"
            class="text-sm text-pretty"
          >
            {{ tournament.event.name }}
          </SLink>
        </template>
        <TournamentHeader
          :event-slug="tournament.event.slug"
          :stage-slug="tournament.slug"
          :active-tab="activeTab"
          :stats="tournament.source !== 'startgg'"
        />
      </TournamentHero>
      <NuxtPage :tournament="tournament" />
    </template>
  </HubPageBody>
</template>
