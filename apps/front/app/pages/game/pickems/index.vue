<script setup lang="ts">
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const localePath = useLocalePath();

setPageSeo({
  title: t("page.game.pickems.title"),
  description: t("page.game.pickems.description"),
});

const {
  data: tournamentsResponse,
  pending,
  error,
  refresh,
} = await useLazyAsyncData(`tournaments-pickems`, () =>
  getAllTournaments({ limit: 10, pickems: true }),
);

const tournaments = computed(() => tournamentsResponse.value?.tournaments ?? []);
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiHubPageHeader>
      <template #title>{{ $t("page.game.pickems.title") }}</template>
      <template v-if="tournaments?.length" #meta>
        <span>{{ t("page.hub.headers.pickemsOpen", { count: tournaments.length }) }}</span>
      </template>
    </UiHubPageHeader>

    <UiCard v-if="pending && !tournaments?.length" class="p-4" aria-live="polite">
      <div class="flex flex-col gap-2">
        <USkeleton v-for="i in 4" :key="i" class="h-row w-full" />
      </div>
    </UiCard>

    <UiCard v-else-if="error">
      <div class="flex flex-col items-center gap-3 py-12 px-4 text-center">
        <UIcon name="i-fluent-warning-24-regular" class="text-4xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ $t("page.game.pickems.list.error") }}
        </p>
        <UButton variant="outline" @click="refresh()">
          {{ $t("page.game.pickems.list.retry") }}
        </UButton>
      </div>
    </UiCard>

    <UiCard v-else-if="tournaments && tournaments.length > 0" flush-bottom>
      <TournamentRow
        v-for="tournament in tournaments"
        :key="tournament.id"
        :tournament="tournament"
        :to="localePath(`/game/pickems/${tournament.id}`)"
      />
    </UiCard>

    <UiCard v-else>
      <div class="flex flex-col items-center gap-2 py-12 px-4 text-center">
        <p class="text-sm text-muted text-pretty">
          {{ $t("page.game.pickems.list.empty") }}
        </p>
      </div>
    </UiCard>
  </div>
</template>
