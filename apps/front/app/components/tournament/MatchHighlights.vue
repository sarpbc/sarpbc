<script lang="ts" setup>
import type { Match } from "~/types/matches";

const {
  tournamentId,
  liveMatches,
  upcomingMatches,
  pending = false,
  hasError = false,
} = defineProps<{
  tournamentId: string;
  liveMatches: Match[];
  upcomingMatches: Match[];
  pending?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t } = useI18n();

const hasMatches = computed(() => liveMatches.length > 0 || upcomingMatches.length > 0);
</script>

<template>
  <section class="w-full flex flex-col gap-3" aria-labelledby="tournament-matches-title">
    <div class="flex items-center justify-between gap-3 pl-1">
      <h2 id="tournament-matches-title" class="text-xl font-semibold tracking-tight">
        {{ t("page.tournaments.id.matchHighlights.title") }}
      </h2>
      <ULink
        :to="$localePath(`/tournaments/${tournamentId}/matches`)"
        class="text-sm text-muted hover:text-highlighted"
      >
        {{ t("page.tournaments.id.matchHighlights.viewSchedule") }}
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
        <p class="text-sm text-muted">
          {{ t("page.tournaments.id.matchHighlights.error") }}
        </p>
        <UButton variant="outline" color="error" @click="emit('retry')">
          {{ t("page.tournaments.id.retry") }}
        </UButton>
      </div>
    </UiCard>

    <div v-else-if="hasMatches" class="flex flex-col gap-4">
      <section v-if="liveMatches.length > 0" class="flex flex-col gap-2">
        <h3 class="text-sm font-medium text-highlighted pl-1">
          {{ t("page.tournaments.id.matchHighlights.live") }}
        </h3>
        <UiCard class="border-error/30 bg-error/5 ring-1 ring-error/15">
          <div v-for="(match, index) in liveMatches" :key="match.id">
            <ULink
              :to="$localePath(`/matches/${match.id}`)"
              class="block hover:bg-elevated/50 transition-colors"
            >
              <MatchRow :match="match" live :last="index === liveMatches.length - 1" />
            </ULink>
          </div>
        </UiCard>
      </section>

      <section v-if="upcomingMatches.length > 0" class="flex flex-col gap-2">
        <h3 class="text-sm font-medium text-toned pl-1">
          {{ t("page.tournaments.id.matchHighlights.upcoming") }}
        </h3>
        <UiCard variant="soft">
          <div v-for="(match, index) in upcomingMatches" :key="match.id">
            <ULink
              :to="$localePath(`/matches/${match.id}`)"
              class="block hover:bg-elevated/50 transition-colors"
            >
              <MatchRow :match="match" :last="index === upcomingMatches.length - 1" />
            </ULink>
          </div>
        </UiCard>
      </section>
    </div>

    <UiCard v-else variant="soft">
      <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
        <UIcon name="i-fluent-calendar-clock-24-regular" class="text-3xl text-muted" />
        <p class="text-sm text-muted">
          {{ t("page.tournaments.id.matchHighlights.empty") }}
        </p>
        <p class="text-xs text-dimmed">
          {{ t("page.tournaments.id.matchHighlights.emptyHint") }}
        </p>
      </div>
    </UiCard>
  </section>
</template>
