<script lang="ts" setup>
import type { Match } from "~/types/matches";

const LATEST_RESULTS_LIMIT = 5;

const {
  tournamentId,
  matches = [],
  pending = false,
  hasError = false,
} = defineProps<{
  tournamentId: string;
  matches?: Match[];
  pending?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t } = useI18n();

const latestResults = computed(() => {
  return [...matches]
    .filter((match) => Boolean(match.endAt))
    .sort((a, b) => {
      const aTime = a.endAt ? new Date(a.endAt).getTime() : 0;
      const bTime = b.endAt ? new Date(b.endAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, LATEST_RESULTS_LIMIT);
});

const hasResults = computed(() => latestResults.value.length > 0);
</script>

<template>
  <section class="w-full flex flex-col gap-3" aria-labelledby="tournament-latest-results-title">
    <div class="flex items-center justify-between gap-3 pl-1">
      <h2
        id="tournament-latest-results-title"
        class="text-xl font-semibold tracking-tight text-balance"
      >
        {{ t("page.tournaments.id.latestResults.title") }}
      </h2>
      <ULink
        :to="$localePath(`/tournaments/${tournamentId}/matches`)"
        class="inline-flex items-center min-h-10 px-1 -mr-1 text-sm text-muted hover:text-highlighted touch-manipulation"
      >
        {{ t("page.tournaments.id.latestResults.viewAll") }}
      </ULink>
    </div>

    <div v-if="pending" class="flex flex-col gap-2" aria-live="polite">
      <UiCard v-for="index in 3" :key="index" variant="soft">
        <div class="w-full grid grid-cols-3 gap-2 py-2 px-2 items-center">
          <div class="col-span-2 flex flex-col gap-1">
            <USkeleton class="h-3 w-24" />
            <USkeleton class="h-3 w-28" />
          </div>
          <USkeleton class="col-span-1 h-3 w-10 justify-self-end" />
        </div>
      </UiCard>
    </div>

    <UiCard v-else-if="hasError" variant="soft">
      <div class="flex flex-col items-center gap-3 py-8 px-4 text-center">
        <UIcon name="i-fluent-warning-24-regular" class="text-3xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t("page.tournaments.id.latestResults.error") }}
        </p>
        <UButton variant="outline" color="error" @click="emit('retry')">
          {{ t("page.tournaments.id.retry") }}
        </UButton>
      </div>
    </UiCard>

    <UiCard v-else-if="hasResults" flush-bottom variant="soft">
      <div v-for="match in latestResults" :key="match.id">
        <ULink
          :to="$localePath(`/matches/${match.id}`)"
          class="block hover:bg-elevated/50 transition-[colors,transform] active:scale-[0.96] touch-manipulation"
        >
          <MatchResultRow :match="match" />
        </ULink>
      </div>
    </UiCard>

    <UiCard v-else variant="soft">
      <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
        <UIcon name="i-fluent-checkmark-circle-24-regular" class="text-3xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t("page.tournaments.id.latestResults.empty") }}
        </p>
        <p class="text-xs text-dimmed text-pretty">
          {{ t("page.tournaments.id.latestResults.emptyHint") }}
        </p>
      </div>
    </UiCard>
  </section>
</template>
