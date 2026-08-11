<script lang="ts" setup>
import { isPickemTournamentActive } from "~/utils/pickems";

const route = useRoute();
const { t } = useI18n();

const tournamentId = computed(() => route.params.id as string);

const { data: tournament } = await useAsyncData(
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

const showPickemCta = computed(
  () => tournament.value != null && isPickemTournamentActive(tournament.value),
);
</script>

<template>
  <div v-if="tournament" class="w-full flex flex-col gap-4">
    <PickemPromoBanner v-if="showPickemCta" :tournament="tournament" variant="homepage" />
    <section class="w-full flex flex-col gap-px" aria-labelledby="tournament-bracket-title">
      <h2
        id="tournament-bracket-title"
        class="flex text-sm font-medium text-toned h-10.75 items-end pl-1 text-balance"
      >
        {{ $t("page.tournaments.id.bracketTitle") }}
      </h2>
      <UCard variant="soft" class="w-full" :ui="{ body: 'p-2 overflow-x-auto' }">
        <TournamentBracket :tournament="tournament" />
      </UCard>
    </section>
    <TournamentParticipants :tournament="tournament" />
  </div>
</template>
