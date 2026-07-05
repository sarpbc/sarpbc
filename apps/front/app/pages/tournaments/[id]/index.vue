<script lang="ts" setup>
const route = useRoute();
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const tournamentId = computed(() => route.params.id as string);

const { data: tournament } = await useLazyAsyncData(`tournament-${tournamentId.value}`, () =>
  getTournamentById(tournamentId.value),
);

const title = computed(() =>
  tournament.value
    ? t(`page.tournaments.id.seoTitle`, {
        tournamentName: tournament.value.name,
      })
    : "",
);

const description = computed(() =>
  tournament.value
    ? t(`page.tournaments.id.seoDescription`, {
        tournamentName: tournament.value.name,
      })
    : "",
);

setPageSeo({
  title: title.value,
  description: description.value,
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiCrossCard v-if="tournament" class="w-full h-14">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-2xl font-semibold">{{ tournament.league?.name }} {{ tournament.name }}</h1>
      </div>
    </UiCrossCard>
    <TournamentHeader :tournament-id="tournamentId" active-tab="overview" />
    <UCard v-if="tournament" variant="soft" class="w-full" :ui="{ body: 'p-2 overflow-x-auto' }">
      <TournamentBracket :tournament="tournament" />
    </UCard>
  </div>
</template>
