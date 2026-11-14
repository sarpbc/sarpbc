<script lang="ts" setup>
import type { CareerEventDefinition, CareerStage } from "~/types/career";

const { event, stage, decisionIndex, decisionCount } = defineProps<{
  event: CareerEventDefinition;
  stage: CareerStage;
  decisionIndex: number;
  decisionCount: number;
}>();

const emit = defineEmits<{
  choose: [choiceId: string];
}>();

const { t } = useI18n();

const eventKey = computed(() => `page.game.career.events.${event.id}`);

const stageLabel = computed(() => {
  switch (stage) {
    case "split1": {
      return t("page.game.career.event.split", { split: 1 });
    }

    case "split2": {
      return t("page.game.career.event.split", { split: 2 });
    }

    case "worlds": {
      return t("page.game.career.event.worlds");
    }

    default: {
      const _exhaustive: never = stage;

      return _exhaustive;
    }
  }
});

const decisionLabel = computed(() => {
  if (decisionCount <= 1) {
    return "";
  }

  return t("page.game.career.event.decision", {
    current: decisionIndex,
    total: decisionCount,
  });
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-xs font-medium text-muted">
      {{ stageLabel }}
      <span v-if="decisionLabel"> · {{ decisionLabel }}</span>
    </p>
    <div class="space-y-2">
      <h2 class="text-lg font-medium tracking-tight">
        {{ t(`${eventKey}.title`) }}
      </h2>
      <p class="text-sm text-muted text-pretty">
        {{ t(`${eventKey}.description`) }}
      </p>
    </div>
    <div class="border border-separator">
      <button
        v-for="choice in event.choices"
        :key="choice.id"
        type="button"
        class="w-full border-b border-separator px-3 py-3 text-left text-sm last:border-b-0 touch-manipulation interactive-surface"
        @click="emit('choose', choice.id)"
      >
        {{ t(`${eventKey}.choices.${choice.id}.label`) }}
      </button>
    </div>
  </div>
</template>
