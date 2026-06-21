<script setup lang="ts">
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

setPageSeo({
  title: t("page.game.pickems.title"),
  description: t("page.game.pickems.description"),
});

const { data: tournaments } = await useLazyAsyncData(`tournaments-pickems`, () =>
  getAllTournaments({ limit: 10, pickems: true }),
);
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiCrossCard class="h-14">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-xl font-semibold">
          {{ $t("page.game.pickems.title") }}
        </h1>
      </div>
    </UiCrossCard>
    <div class="flex flex-col gap-0">
      <TournamentRow
        v-for="tournament in tournaments"
        :key="tournament.id"
        :tournament="tournament"
        :to="$localePath(`/game/pickems/${tournament.id}`)"
      />
    </div>
  </div>
</template>
