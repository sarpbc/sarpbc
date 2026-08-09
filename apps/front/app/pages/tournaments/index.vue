<script lang="ts" setup>
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const { data: tournaments } = await useLazyAsyncData(`tournaments-index`, () =>
  getAllTournaments({ limit: 10 }),
);

const nextTournament = computed(() => {
  const now = Date.now();
  return (tournaments.value ?? [])
    .filter((tournament) => {
      if (!tournament.beginAt) {
        return false;
      }
      return new Date(tournament.beginAt).getTime() > now;
    })
    .sort(
      (a, b) => new Date(a.beginAt!).getTime() - new Date(b.beginAt!).getTime(),
    )[0];
});

setPageSeo({
  title: `${t("page.tournaments.index.title")} | sarpbc.org`,
  description: "Browse all Rocket League tournaments, brackets, and schedules on sarpbc.org",
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiHubPageHeader>
      <template #title>{{ t("page.tournaments.index.title") }}</template>
      <template v-if="nextTournament" #meta>
        <span>
          {{
            t("page.hub.headers.tournamentsNext", {
              name: `${nextTournament.league?.name ?? ""} ${nextTournament.name}`.trim(),
            })
          }}
        </span>
      </template>
    </UiHubPageHeader>
    <div class="w-full flex flex-col gap-0">
      <TournamentRow
        v-for="tournament in tournaments"
        :key="tournament.id"
        :tournament="tournament"
      />
    </div>
  </div>
</template>
