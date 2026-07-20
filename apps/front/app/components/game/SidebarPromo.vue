<script lang="ts" setup>
const localePath = useLocalePath();
</script>

<template>
  <div class="w-full flex flex-col">
    <div class="flex flex-col-reverse text-sm font-medium text-toned md:h-18 pl-2 pb-1">
      {{ $t("components.game.sidebarPromo.heading") }}
    </div>
    <UiCard class="flex flex-col gap-3 p-3">
      <div class="flex flex-col gap-1">
        <h2 class="text-sm font-semibold tracking-tight">
          {{ $t("components.game.sidebarPromo.title") }}
        </h2>
        <p class="text-xs text-pretty text-muted">
          {{ $t("components.game.sidebarPromo.description") }}
        </p>
      </div>
      <UButton
        :to="localePath('/game/airriddle')"
        color="primary"
        variant="soft"
        size="sm"
        class="w-full font-normal"
      >
        {{ $t("components.game.sidebarPromo.cta") }}
      </UButton>
    </UiCard>
  </div>
</template>
