<script setup lang="ts">
const games = computed(() => [
  { to: "/game/airriddle", title: "page.game.airriddle.title" },
  { to: "/game/career", title: "page.game.career.title" },
]);
</script>

<template>
  <SRail :title="$t('components.game.sidebarPromo.heading')">
    <div class="grid grid-cols-2 gap-2">
      <NuxtLink
        v-for="game in games"
        :key="game.to"
        :to="$localePath(game.to)"
        class="group flex aspect-square flex-col justify-between bg-muted p-3 transition-none hover:bg-elevated"
      >
        <span class="text-base font-medium leading-tight text-default group-hover:text-highlighted">
          {{ $t(game.title) }}
        </span>
        <span class="text-xs text-muted">{{ $t("components.game.sidebarPromo.play") }}</span>
      </NuxtLink>
    </div>
  </SRail>
</template>
