<script lang="ts" setup>
import type { TournamentTab } from "@sarpbc/types";
import { tournamentEventPath, tournamentStageLabel } from "@sarpbc/utils";
import { tournamentCalendarPath } from "~/utils/calendar/ics";
import {
  buildTournamentSportsEvent,
  getTournamentChampion,
} from "~/utils/structuredData/tournamentSportsEvent";
import { getTournamentTabFromRouteName, tournamentTabPath } from "~/utils/tournamentTabRoute";

definePageMeta({ viewTransition: false });

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const getRouteBaseName = useRouteBaseName();
const { setPageSeo } = useSarpbcSeo();
const { setJsonLd } = useStructuredData();

// A string, not the segments array: switching Overview / Matches must not refetch the stage.
const stagePath = computed(() => `${route.params.event as string}/${route.params.stage as string}`);

const {
  data: resolved,
  pending,
  error,
  refresh,
} = await useAsyncData(
  () => `tournament-path-${stagePath.value}`,
  () => resolveTournamentPath(stagePath.value.split("/")),
  {
    watch: [stagePath],
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
const canonicalPath = localePath(
  tournamentTabPath(
    resolvedTab === "overview" ? activeTab.value : resolvedTab,
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
            variant="muted"
            class="text-sm text-pretty"
          >
            {{ tournament.event.name }}
          </SLink>
        </template>
        <TournamentHeader
          :event-slug="tournament.event.slug"
          :stage-slug="tournament.slug"
          :active-tab="activeTab"
        />
      </TournamentHero>
      <NuxtPage :tournament="tournament" />
    </template>
  </SHubPageBody>
</template>
