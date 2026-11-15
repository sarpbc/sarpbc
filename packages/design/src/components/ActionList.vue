<script setup lang="ts">
import type { ActionItem } from "../types.ts";

/* Each row acts at once (a game decision, a reply); for a choice to confirm later, use RadioGroup. */
const { items } = defineProps<{ items: readonly ActionItem[] }>();

const emit = defineEmits<{ select: [value: string] }>();
</script>

<template>
  <div class="sb-action-list">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      class="sb-action-list__item"
      :data-danger="item.danger || undefined"
      @click="emit('select', item.value)"
    >
      <span class="sb-action-list__label">{{ item.label }}</span>
      <span v-if="item.description" class="sb-action-list__description">
        {{ item.description }}
      </span>
    </button>
  </div>
</template>

<style scoped>
@layer components {
  .sb-action-list {
    display: flex;
    flex-direction: column;
    /* A border, not an inset shadow: a hovered row's background would paint over the shadow. */
    border: 1px solid var(--sb-border);
  }

  .sb-action-list__item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    width: 100%;
    padding: 0.75rem;
    border: 0;
    border-bottom: 1px solid var(--sb-border);
    background: none;
    color: var(--sb-text);
    font: inherit;
    font-size: 0.875rem;
    line-height: 1.25rem;
    text-align: start;
    cursor: pointer;
    touch-action: manipulation;
  }

  .sb-action-list__item:last-child {
    border-bottom: 0;
  }

  @media (hover: hover) {
    .sb-action-list__item:hover {
      background: var(--sb-bg-elevated);
    }
  }

  .sb-action-list__item:active {
    background: var(--sb-bg-elevated);
  }

  .sb-action-list__item:focus-visible {
    outline: 1px solid var(--sb-primary);
    outline-offset: -1px;
  }

  .sb-action-list__description {
    color: var(--sb-text-muted);
    font-size: 0.75rem;
    line-height: 1rem;
  }

  .sb-action-list__item[data-danger] .sb-action-list__description {
    color: var(--sb-error);
  }
}
</style>
