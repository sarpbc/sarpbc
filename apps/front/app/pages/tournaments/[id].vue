<script lang="ts" setup>
import {
  getTournamentTabFromPath,
  getTournamentTabTransitionName,
  type TournamentTab,
} from "~/utils/tournamentTabRoute";

const route = useRoute();
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const tournamentId = computed(() => route.params.id as string);

const {
  data: tournament,
  pending,
  error,
  refresh,
} = await useAsyncData(
  () => `tournament-${tournamentId.value}`,
  async () => {
    const result = await getTournamentById(tournamentId.value);
    if (!result) {
      throw createError({
        statusCode: 404,
        message: t("page.tournaments.id.notFound"),
      });
    }
    return result;
  },
  {
    watch: [tournamentId],
    default: () => null,
  },
);

const activeTab = computed<TournamentTab>(() => getTournamentTabFromPath(route.path));

const tabTransitionName = ref("tournament-tab-left");

const tabTransition = computed(() => ({
  name: tabTransitionName.value,
}));

onBeforeRouteUpdate((to, from) => {
  if (to.params.id !== from.params.id) {
    return;
  }

  const nextTransition = getTournamentTabTransitionName(from.path, to.path);
  if (nextTransition) {
    tabTransitionName.value = nextTransition;
  }
});

const title = computed(() =>
  tournament.value
    ? t("page.tournaments.id.seoTitle", {
        tournamentName: tournament.value.name,
      })
    : t("page.tournaments.id.seoTitleDefault"),
);

const description = computed(() =>
  tournament.value
    ? t("page.tournaments.id.seoDescription", {
        tournamentName: tournament.value.name,
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
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div v-if="pending" class="w-full flex flex-col gap-4" aria-live="polite">
      <UiCrossCard class="h-24">
        <div class="w-full p-4 animate-pulse flex flex-col gap-3 items-center">
          <div class="h-3 w-32 rounded bg-elevated" />
          <div class="h-8 w-full max-w-md rounded bg-elevated" />
          <div class="h-3 w-48 rounded bg-elevated" />
        </div>
      </UiCrossCard>
    </div>

    <UiCard v-else-if="error">
      <div class="flex flex-col items-center gap-3 py-12 px-4 text-center">
        <UIcon name="i-fluent-warning-24-regular" class="text-4xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t("page.tournaments.id.error") }}
        </p>
        <UButton variant="outline" @click="refresh()">
          {{ t("page.tournaments.id.retry") }}
        </UButton>
      </div>
    </UiCard>

    <template v-else-if="tournament">
      <TournamentHero :tournament="tournament" />
      <TournamentHeader :tournament-id="tournamentId" :active-tab="activeTab" />
      <div class="tournament-tab-outlet overflow-hidden">
        <NuxtPage :transition="tabTransition" />
      </div>
    </template>
  </div>
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
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 200ms cubic-bezier(0.16, 1, 0.3, 1);
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
    transition: opacity 150ms ease;
  }

  .tournament-tab-left-enter-from,
  .tournament-tab-left-leave-to,
  .tournament-tab-right-enter-from,
  .tournament-tab-right-leave-to {
    transform: none;
  }
}
</style>
