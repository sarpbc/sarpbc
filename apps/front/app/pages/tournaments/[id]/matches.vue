<script lang="ts" setup>
const route = useRoute();
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const tournamentId = computed(() => route.params.id as string);

const { data: tournament } = await useLazyAsyncData(`tournament-${tournamentId.value}`, () =>
  getTournamentById(tournamentId.value),
);

const { data: matches } = await useLazyAsyncData(`tournament-matches-${tournamentId.value}`, () =>
  getTournamentMatches(tournamentId.value),
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
    <TournamentHeader :tournament-id="tournamentId" active-tab="matches" />
    <UiCard variant="soft" class="w-full">
      <div v-if="matches && matches.length > 0" class="flex flex-col">
        <template v-for="(match, index) in matches" :key="match.id">
          <MatchResultRow v-if="match.endAt" :match="match" :last="index === matches.length - 1" />
          <MatchRow v-else :match="match" :last="index === matches.length - 1" />
        </template>
      </div>
      <div v-else class="text-center py-8 text-muted">
        {{ t("page.tournaments.id.noMatches") }}
      </div>
    </UiCard>
  </div>
</template>
