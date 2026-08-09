<script lang="ts" setup>
import type { CareerEventDefinition } from "~/types/career";

const props = defineProps<{
  event: CareerEventDefinition;
  eventIndex: number;
  eventTotal: number;
}>();

const emit = defineEmits<{
  choose: [choiceId: string];
}>();

const { t } = useI18n();

const eventKey = computed(() => `page.game.career.events.${props.event.id}`);
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-xs font-semibold text-muted tabular-nums">
      {{
        t("page.game.career.season.eventProgress", {
          current: eventIndex,
          total: eventTotal,
        })
      }}
    </p>
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
        {{ t(`${eventKey}.choices.${choice.id}`) }}
      </UButton>
    </div>
  </div>
</template>
