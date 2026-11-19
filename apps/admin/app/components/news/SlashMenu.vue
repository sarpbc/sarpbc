<script setup lang="ts">
import type { SlashGroup, SlashItem } from "~/utils/editor/slash-commands";

const { command, groups, highlighted } = defineProps<{
  command: (item: SlashItem) => void;
  groups: readonly SlashGroup[];
  highlighted: number;
}>();

const { t } = useI18n();

const items = computed(() => groups.flatMap((group) => group.items));

const indexOf = (item: SlashItem) => items.value.indexOf(item);
</script>

<template>
  <div class="slash-menu" role="listbox" :aria-label="t('page.news.editor.blocks')">
    <p v-if="items.length === 0" class="slash-menu__empty">{{ t("page.news.editor.noBlock") }}</p>
    <div v-for="group in groups" :key="group.label" role="group" :aria-label="group.label">
      <p class="slash-menu__heading">{{ group.label }}</p>
      <div
        v-for="item in group.items"
        :key="item.label"
        role="option"
        class="slash-menu__item"
        :aria-selected="indexOf(item) === highlighted"
        @mousedown.prevent="command(item)"
      >
        <Icon :name="item.icon" class="slash-menu__icon" />
        {{ item.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.slash-menu {
  position: fixed;
  z-index: 60;
  width: 14rem;
  max-height: 20rem;
  overflow-y: auto;
  padding: 0.25rem;
  background: var(--sb-bg);
  box-shadow:
    inset 0 0 0 1px var(--sb-border),
    0 4px 12px rgb(0 0 0 / 0.12);
}

.slash-menu__heading {
  margin: 0;
  padding: 0.375rem 0.375rem 0.25rem;
  color: var(--sb-text-highlighted);
  font-size: 0.75rem;
  font-weight: 600;
}

.slash-menu__item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  width: 100%;
  height: 1.75rem;
  padding: 0 0.375rem;
  color: var(--sb-text);
  font-size: var(--sb-control-text);
  cursor: pointer;
  user-select: none;
}

.slash-menu__item[aria-selected="true"] {
  background: var(--sb-bg-elevated);
  color: var(--sb-text-highlighted);
}

@media (hover: hover) {
  .slash-menu__item:hover {
    background: var(--sb-bg-elevated);
  }
}

.slash-menu__icon {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  color: var(--sb-text-dimmed);
}

.slash-menu__empty {
  margin: 0;
  padding: 0.375rem;
  color: var(--sb-text-muted);
  font-size: var(--sb-control-text);
}
</style>
