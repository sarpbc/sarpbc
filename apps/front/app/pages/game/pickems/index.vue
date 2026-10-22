<script setup lang="ts">
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const localePath = useLocalePath();

setPageSeo({
  title: t("page.game.pickems.seo.title"),
  description: t("page.game.pickems.seo.description"),
});

const {
  data: eventsResponse,
  pending,
  error,
  refresh,
} = await useLazyAsyncData("tournament-events-pickems", () =>
  getEvents({ limit: 10, pickems: true }),
);

const events = computed(() => eventsResponse.value?.events ?? []);
const stageCount = computed(() =>
  events.value.reduce((count, event) => count + event.stages.length, 0),
);
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>{{ $t("page.game.pickems.title") }}</template>
      <template v-if="stageCount > 0" #meta>
        <span>{{ t("page.hub.headers.pickemsOpen", { count: stageCount }) }}</span>
      </template>
    </SHubPageHeader>

    <SCard v-if="pending && !events.length" class="p-4" aria-live="polite">
      <div class="flex flex-col gap-2">
        <USkeleton v-for="i in 4" :key="i" class="h-row w-full" />
      </div>
    </SCard>

    <SCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="$t('page.game.pickems.list.error')" @retry="refresh()" />
    </SCard>

    <TournamentListGroup
      v-else-if="events.length > 0"
      :events="events"
      :to="(stage) => localePath(`/game/pickems/${stage.id}`)"
    />

    <SCard v-else>
      <div class="flex flex-col items-center gap-2 py-12 px-4 text-center">
        <p class="text-sm text-muted text-pretty">
          {{ $t("page.game.pickems.list.empty") }}
        </p>
      </div>
    </SCard>
  </div>
</template>
