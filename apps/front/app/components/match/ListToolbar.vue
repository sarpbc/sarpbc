<script lang="ts" setup>
defineProps<{
  tab: MatchesTab;
  tabItems: { value: MatchesTab; label: string }[];
  getTabQuery: (nextTab: MatchesTab) => Record<string, string>;
  tournamentFilterOptions: MatchFilterOption[];
  selectedTournamentFilterValue: string;
  hasActiveFilters: boolean;
}>();

const emit = defineEmits<{
  tournamentChange: [value: string | number | boolean | undefined];
  clear: [];
}>();

const { t } = useI18n();
const { attrs: cuelumeAttrs, pressClass } = useCuelume();
</script>

<template>
  <UiCard class="h-row border-0">
    <div class="h-full flex flex-row justify-between items-center">
      <div class="flex gap-1">
        <UButton
          v-for="item in tabItems"
          :key="item.value"
          variant="soft"
          :color="tab === item.value ? 'primary' : 'neutral'"
          :to="{ path: $localePath('/matches'), query: getTabQuery(item.value) }"
          v-bind="cuelumeAttrs.toggle"
        >
          {{ item.label }}
        </UButton>
      </div>

      <div class="flex min-w-0" role="group" :aria-label="t('page.matches.filters.title')">
        <USelect
          :model-value="selectedTournamentFilterValue"
          :items="tournamentFilterOptions"
          value-key="value"
          label-key="label"
          variant="ghost"
          :aria-label="t('page.matches.filters.tournament')"
          :ui="{ content: 'min-w-fit' }"
          class="min-w-0"
          @update:model-value="emit('tournamentChange', $event)"
        />
        <UButton
          v-if="hasActiveFilters"
          variant="ghost"
          color="neutral"
          icon="i-fluent-dismiss-circle-24-regular"
          :aria-label="t('page.matches.filters.clear')"
          :class="pressClass"
          v-bind="cuelumeAttrs.pressRelease"
          @click="emit('clear')"
        />
      </div>
    </div>
  </UiCard>
</template>
