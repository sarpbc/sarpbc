<script setup lang="ts">
import { TabsList, TabsRoot, TabsTrigger } from "reka-ui";

import type { SelectOption } from "../types.ts";

const model = defineModel<string>({ required: true });

const { ariaLabel, items } = defineProps<{
  ariaLabel: string;
  /** Short labels; the panels below are the page's own content. */
  items: readonly SelectOption<string>[];
}>();
</script>

<template>
  <TabsRoot v-model="model" activation-mode="manual">
    <TabsList class="sb-tabs" :aria-label="ariaLabel">
      <TabsTrigger
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        :disabled="item.disabled"
        class="sb-tabs__trigger"
      >
        {{ item.label }}
      </TabsTrigger>
    </TabsList>
  </TabsRoot>
</template>

<style scoped>
/* One look: a framed row of slash-separated labels, dense enough for a page header. */
@layer components {
  .sb-tabs {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    height: 1.75rem;
    padding: 0 0.5rem;
    box-shadow: inset 0 0 0 1px var(--sb-border);
  }

  .sb-tabs__trigger {
    display: inline-flex;
    align-items: center;
    height: 100%;
    padding: 0 0.25rem;
    border: 0;
    background: none;
    color: var(--sb-text-muted);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
  }

  .sb-tabs__trigger + .sb-tabs__trigger {
    padding-inline-start: 0;
  }

  .sb-tabs__trigger + .sb-tabs__trigger::before {
    margin-inline-end: 0.5rem;
    color: var(--sb-text-dimmed);
    font-weight: 400;
    content: "/";
  }

  @media (hover: hover) {
    .sb-tabs__trigger[data-state="inactive"]:hover {
      color: var(--sb-text);
    }
  }

  .sb-tabs__trigger[data-state="active"] {
    color: var(--sb-text-highlighted);
  }

  .sb-tabs__trigger:focus-visible {
    outline: 1px solid var(--sb-primary);
    outline-offset: 2px;
  }
}
</style>
