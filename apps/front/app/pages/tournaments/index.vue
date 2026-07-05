<script lang="ts" setup>
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const { data: tournaments } = await useLazyAsyncData(`tournaments-index`, () =>
  getAllTournaments({ limit: 10 }),
);

setPageSeo({
  title: `${t("page.tournaments.index.title")} | sarpbc.org`,
  description: "Browse all Rocket League tournaments, brackets, and schedules on sarpbc.org",
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiCrossCard class="h-14">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-xl font-semibold">
          {{ t("page.tournaments.index.title") }}
        </h1>
      </div>
    </UiCrossCard>
    <div class="w-full flex flex-col gap-0">
      <TournamentRow
        v-for="tournament in tournaments"
        :key="tournament.id"
        :tournament="tournament"
      />
    </div>
  </div>
</template>
