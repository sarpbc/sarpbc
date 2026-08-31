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
    <section class="w-full" aria-labelledby="tournament-bracket-title">
      <SRail>
        <template #caption>
          <h2 id="tournament-bracket-title">
            {{ $t("page.tournaments.id.bracketTitle") }}
          </h2>
        </template>
        <SCard class="overflow-x-auto p-2">
          <TournamentBracket :tournament="tournament" />
        </SCard>
      </SRail>
    </section>
    <TournamentParticipants :tournament="tournament" />
  </div>
</template>
