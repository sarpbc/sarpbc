<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";

const { tournament, variant = "homepage" } = defineProps<{
  tournament: Tournament;
  variant?: "homepage" | "match";
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const eventName = computed(() => tournament.league?.name || tournament.name || "");

const title = computed(() => {
  switch (variant) {
    case "match":
      return t("page.game.pickems.matchCta.title");
    case "homepage":
      return t("page.game.pickems.banner.title", { event: eventName.value });
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
});

const ctaLabel = computed(() => {
  switch (variant) {
    case "match":
      return t("page.game.pickems.matchCta.cta");
    case "homepage":
      return t("page.game.pickems.banner.cta");
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
});

const pickemPath = computed(() => localePath(`/game/pickems/${tournament.id}`));
</script>

<template>
  <SCrossCard class="h-row-header">
    <div class="w-full flex items-center justify-between gap-3 px-4">
      <h2 class="min-w-0 truncate text-xl font-semibold">
        {{ title }}
      </h2>
      <UButton :to="pickemPath" color="neutral" size="sm" class="shrink-0">
        {{ ctaLabel }}
      </UButton>
    </div>
  </SCrossCard>
</template>
