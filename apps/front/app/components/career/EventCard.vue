<script lang="ts" setup>
import type { CareerEventDefinition, CareerStage } from "~/types/career";

const props = defineProps<{
  event: CareerEventDefinition;
  stage: CareerStage;
}>();

const emit = defineEmits<{
  choose: [choiceId: string];
}>();

const { t } = useI18n();

const eventKey = computed(() => `page.game.career.events.${props.event.id}`);

const stageLabel = computed(() => {
  switch (props.stage) {
    case "split1":
      return t("page.game.career.event.splitDecision", { split: 1 });
    case "split2":
      return t("page.game.career.event.splitDecision", { split: 2 });
    case "worlds":
      return t("page.game.career.event.worldsDecision");
    default: {
      const _exhaustive: never = props.stage;
      return _exhaustive;
    }
  }
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-xs font-semibold text-muted">{{ stageLabel }}</p>
    <div class="space-y-2">
      <h2 class="text-lg font-semibold tracking-tight">
        {{ t(`${eventKey}.title`) }}
      </h2>
      <p class="text-sm text-muted text-pretty">
        {{ t(`${eventKey}.description`) }}
      </p>
    </div>
    <div class="flex flex-col gap-2">
      <UButton
        v-for="choice in event.choices"
        :key="choice.id"
        variant="outline"
        class="justify-start text-left"
        @click="emit('choose', choice.id)"
      >
        {{ t(`${eventKey}.choices.${choice.id}.label`) }}
      </UButton>
    </div>
  </div>
</template>
