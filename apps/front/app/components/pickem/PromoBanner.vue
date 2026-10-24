<script lang="ts" setup>
const { tournament, variant = "homepage" } = defineProps<{
  tournament: { id: string; event: { name: string } };
  variant?: "homepage" | "match";
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const eventName = computed(() => tournament.event.name);

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
      <h2 class="min-w-0 truncate text-xl font-medium">
        {{ title }}
      </h2>
      <UButton :to="pickemPath" color="neutral" variant="outline" size="sm" class="shrink-0">
        {{ ctaLabel }}
      </UButton>
    </div>
  </SCrossCard>
</template>
