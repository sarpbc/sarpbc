<script lang="ts" setup>
import type { Player } from "@sarpbc/types";
import { playerPath } from "@sarpbc/utils";

const { players } = defineProps<{
  players: Player[];
}>();

const { t } = useI18n();

const headingId = "team-roster-title";
</script>

<template>
  <section class="flex flex-col" :aria-labelledby="headingId">
    <h2 :id="headingId" class="flex h-row items-end pb-2 pl-2 text-sm font-medium text-highlighted">
      {{ t("page.team.slug.players") }}
    </h2>

    <div v-if="players.length" class="grid flex-1 grid-cols-3 gap-2">
      <ULink
        v-for="player in players"
        :key="player.id"
        :to="$localePath(playerPath(player.slug))"
        class="group flex min-w-0 flex-col overflow-hidden bg-muted touch-manipulation interactive-surface"
      >
        <div class="flex aspect-4/3 items-center justify-center overflow-hidden bg-elevated">
          <NuxtImg
            v-if="player.imageUrl"
            :src="player.imageUrl"
            :alt="player.name"
            width="320"
            height="240"
            sizes="33vw md:200px"
            loading="lazy"
            class="h-full w-full object-cover"
          />
          <PlayerImg v-else :player-name="player.name" size="lg" />
        </div>
        <div class="flex min-w-0 items-center gap-2 px-3 py-3">
          <FlagIcon :nationality="player.nationality" class="shrink-0" />
          <span class="truncate text-sm font-medium text-default group-hover:text-highlighted">
            {{ player.name }}
          </span>
        </div>
      </ULink>
    </div>

    <div
      v-else
      class="flex flex-1 flex-col items-center justify-center gap-2 bg-muted py-8 px-4 text-center"
    >
      <UIcon name="i-fluent-people-team-24-regular" class="text-3xl text-muted" />
      <p class="text-sm text-muted text-pretty">
        {{ t("page.team.slug.roster.empty") }}
      </p>
      <p class="text-xs text-muted text-pretty">
        {{ t("page.team.slug.roster.emptyHint") }}
      </p>
    </div>
  </section>
</template>
