<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";
import type { Match } from "~/types/match";

const route = useRoute();
const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const tournamentId = computed(() => route.params.id as string);

const { data: tournament } = await useLazyAsyncData(`tournament-${tournamentId.value}`, () =>
  getTournamentById(tournamentId.value),
);

const { data: picks, refresh } = useLazyAsyncData(
  `tournament-${tournamentId.value}-picks`,
  async () => {
    const newPicks = await getUserPickemsForTournament(tournamentId.value);
    return new Map<string, string>(newPicks.map((pick) => [pick.match, pick.pickedParticipant]));
  },
  { server: false },
);

setPageSeo({
  title: tournament.value
    ? `${tournament.value.league?.name} ${tournament.value.name} Pick'em`
    : t("page.game.pickems.title"),
  description: t("page.game.pickems.description"),
});

const pickTeam = async (matchId: string, participantId: string) => {
  await updatePickemForMatch(matchId, participantId);
  await refresh();
};

const pickemDf = new DateFormatter(locale.value, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dayHeaderDf = new DateFormatter(locale.value, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const matchesByDay = computed(() => {
  if (!tournament.value?.matches) return [];

  const validMatches = tournament.value.matches.filter(
    (m) => m.participants?.length === 2 && m.beginAt,
  );

  const grouped = validMatches.reduce(
    (acc, match) => {
      const matchDate = new Date(match.beginAt!);
      const dayKey = matchDate.toDateString();

      if (!acc[dayKey]) {
        acc[dayKey] = {
          date: matchDate,
          matches: [],
        };
      }

      acc[dayKey].matches.push(match);
      return acc;
    },
    {} as Record<string, { date: Date; matches: Match[] }>,
  );

  return Object.values(grouped)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((group) => ({
      ...group,
      matches: group.matches.sort(
        (a, b) => new Date(a.beginAt!).getTime() - new Date(b.beginAt!).getTime(),
      ),
    }));
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiCrossCard class="w-full h-14">
      <div v-if="tournament" class="w-full flex justify-center items-center">
        <h1 class="text-xl font-semibold">
          {{ tournament.league?.name }} {{ tournament.name }} Pick'em
        </h1>
      </div>
    </UiCrossCard>
    <UiCard class="w-full">
      <div v-if="tournament && matchesByDay.length > 0" class="w-full flex flex-col gap-4 p-4">
        <div
          v-for="dayGroup in matchesByDay"
          :key="dayGroup.date.toDateString()"
          class="w-full flex flex-col gap-2"
        >
          <div class="flex items-center justify-center py-2">
            <h2 class="text-lg font-medium">
              {{ dayHeaderDf.format(dayGroup.date) }}
            </h2>
          </div>
          <UiCard
            v-for="match in dayGroup.matches"
            :key="match.id"
            class="w-full grid grid-cols-3 items-center justify-between p-2"
          >
            <UButton
              variant="soft"
              class="flex items-center justify-center col-span-1 cursor-pointer"
              :disabled="match.beginAt && new Date(match.beginAt) <= new Date()"
              :color="
                !picks || picks.get(match.id) === undefined
                  ? 'neutral'
                  : picks.get(match.id) === match.participants?.[0]?.id
                    ? 'success'
                    : 'error'
              "
              @click="pickTeam(match.id, match.participants?.[0]?.id || '')"
            >
              {{ match.participants?.[0]?.team.name }}
            </UButton>
            <div class="flex flex-col items-center justify-evenly col-span-1">
              <span v-if="match.beginAt">
                {{ pickemDf.format(new Date(match.beginAt)) }}
              </span>
              <span>vs</span>
            </div>
            <UButton
              variant="soft"
              class="flex items-center justify-center col-span-1 cursor-pointer"
              :disabled="match.beginAt && new Date(match.beginAt) <= new Date()"
              :color="
                !picks || picks.get(match.id) === undefined
                  ? 'neutral'
                  : picks.get(match.id) === match.participants?.[1]?.id
                    ? 'success'
                    : 'error'
              "
              @click="pickTeam(match.id, match.participants?.[1]?.id || '')"
            >
              {{ match.participants?.[1]?.team.name }}
            </UButton>
          </UiCard>
        </div>
      </div>
    </UiCard>
  </div>
</template>
