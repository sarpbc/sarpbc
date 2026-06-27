<script lang="ts" setup>
import type { Match } from "~/types/matches";

const { matches, variant, title } = defineProps<{
  matches: Match[];
  variant: "live" | "upcoming" | "result";
  title?: string;
}>();

const { t } = useI18n();

const eventGroups = computed(() =>
  groupMatchesByEvent(matches, t("page.matches.unknownTournament")),
);
</script>

<template>
  <section class="w-full flex flex-col">
    <h2 v-if="title" class="text-sm font-medium text-toned pl-1">
      {{ title }}
    </h2>

    <div v-for="group in eventGroups" :key="group.key" class="flex flex-col gap-0.25">
      <h3 class="flex text-sm font-medium text-toned h-10.75 items-end">
        <ULink
          v-if="group.tournamentId"
          :to="$localePath(`/tournaments/${group.tournamentId}/matches`)"
          class="hover:text-highlighted h-fit"
        >
          {{ group.displayName }}
        </ULink>
        <span v-else>{{ group.displayName }}</span>
      </h3>
      <UiCard class="flex flex-col">
        <div v-for="(match, index) in group.matches" :key="match.id">
          <ULink
            :to="$localePath(`/matches/${match.id}`)"
            class="block hover:bg-elevated/50 transition-colors"
          >
            <MatchRow
              v-if="variant !== 'result'"
              :match="match"
              :live="variant === 'live'"
              :last="index === group.matches.length - 1"
            />
            <MatchResultRow v-else :match="match" :last="index === group.matches.length - 1" />
          </ULink>
        </div>
      </UiCard>
    </div>
  </section>
</template>
