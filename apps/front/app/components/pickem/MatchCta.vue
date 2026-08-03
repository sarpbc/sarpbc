<script lang="ts" setup>
import type { Match } from "~/types/matches";
import { isPickemOpenForMatch } from "~/utils/pickems";

const { match, matchStatus } = defineProps<{
  match: Match;
  matchStatus: "live" | "finished" | "upcoming";
}>();

const user = useUser();

const tournamentId = computed(() => match.tournament?.id ?? "");

const { data: userPicks } = useLazyAsyncData(
  () => `match-pickem-picks-${tournamentId.value}-${user.value?.id ?? "guest"}`,
  async () => {
    if (!user.value || !tournamentId.value || !match.tournament?.pickemsEnabled) {
      return null;
    }

    try {
      const picks = await getUserPickemsForTournament(tournamentId.value);
      return new Set(picks.map((pick) => pick.match));
    } catch {
      return null;
    }
  },
  {
    server: false,
    watch: [tournamentId, () => user.value?.id],
  },
);

const showCta = computed(() => {
  if (matchStatus !== "upcoming") return false;
  if (!isPickemOpenForMatch(match)) return false;
  if (userPicks.value?.has(match.id)) return false;
  return true;
});
</script>

<template>
  <section v-if="showCta" class="w-full flex flex-col gap-3">
    <PickemPromoBanner :tournament="match.tournament" variant="match" />
  </section>
</template>
