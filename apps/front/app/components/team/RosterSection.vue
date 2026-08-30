<script lang="ts" setup>
import type { Player } from "~/types/player";

const { players } = defineProps<{
  players: Player[];
}>();

const { t } = useI18n();

const headingId = "team-roster-title";
</script>

<template>
  <section :aria-labelledby="headingId">
    <h2 :id="headingId" class="sr-only">
      {{ t("page.team.slug.players") }}
    </h2>

    <div v-if="players.length" class="grid grid-cols-3 border-t border-default">
      <ULink
        v-for="player in players"
        :key="player.id"
        :to="$localePath(`/player/${player.slug}`)"
        class="flex min-w-0 flex-col items-center gap-2 p-3 border-r border-default last:border-r-0 touch-manipulation transition-none hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <PlayerImg :player-name="player.name" :img="player.imageUrl" size="lg" />
        <div class="flex min-w-0 max-w-full flex-row items-center justify-center gap-1">
          <FlagIcon :nationality="player.nationality" class="shrink-0" />
          <span class="truncate text-sm font-medium">{{ player.name }}</span>
        </div>
      </ULink>
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-2 border-t border-default py-8 px-4 text-center"
    >
      <UIcon name="i-fluent-people-team-24-regular" class="text-3xl text-muted" />
      <p class="text-sm text-muted text-pretty">
        {{ t("page.team.slug.roster.empty") }}
      </p>
      <p class="text-xs text-dimmed text-pretty">
        {{ t("page.team.slug.roster.emptyHint") }}
      </p>
    </div>
  </section>
</template>
