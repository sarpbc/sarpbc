<script lang="ts" setup>
import { isPickemTournamentActive } from "~/utils/pickems";

const route = useRoute();
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const tournamentId = computed(() => route.params.id as string);

const { data: tournament } = await useLazyAsyncData(`tournament-${tournamentId.value}`, () =>
  getTournamentById(tournamentId.value),
);

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

const showPickemCta = computed(
  () => tournament.value != null && isPickemTournamentActive(tournament.value),
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
    <UiCrossCard v-if="tournament" class="w-full h-14">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-2xl font-semibold">{{ tournament.league?.name }} {{ tournament.name }}</h1>
      </div>
    </UiCrossCard>
    <TournamentHeader :tournament-id="tournamentId" active-tab="overview" />
    <PickemPromoBanner
      v-if="showPickemCta && tournament"
      :tournament="tournament"
      variant="homepage"
    />
    <section
      v-if="tournament"
      class="w-full flex flex-col gap-3"
      aria-labelledby="tournament-bracket-title"
    >
      <h2 id="tournament-bracket-title" class="text-xl font-semibold tracking-tight">
        {{ $t("page.tournaments.id.bracketTitle") }}
      </h2>
      <UCard variant="soft" class="w-full" :ui="{ body: 'p-2 overflow-x-auto' }">
        <TournamentBracket :tournament="tournament" />
      </UCard>
    </section>
  </div>
</template>
