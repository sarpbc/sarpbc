<script setup lang="ts">
import {
  ListboxContent,
  ListboxFilter,
  ListboxGroup,
  ListboxGroupLabel,
  ListboxItem,
  ListboxRoot,
} from "reka-ui";
import { computed } from "vue";

import { useDesignAdapters } from "../adapters.ts";

import type { CommandGroup, CommandItem } from "../types.ts";

import Spinner from "./Spinner.vue";

const searchTerm = defineModel<string>("searchTerm", { default: "" });

const {
  empty,
  groups,
  loading = false,
  placeholder,
} = defineProps<{
  empty: string;
  groups: readonly CommandGroup[];
  loading?: boolean;
  placeholder: string;
}>();

const adapters = useDesignAdapters();

const matches = (item: CommandItem, query: string) =>
  `${item.label} ${item.suffix ?? ""}`.toLowerCase().includes(query);

const visibleGroups = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();

  return groups
    .map((group) => ({
      ...group,
      items:
        group.remote === true ? group.items : group.items.filter((item) => matches(item, query)),
    }))
    .filter((group) => group.items.length > 0);
});
</script>

<template>
  <ListboxRoot class="sb-command" highlight-on-hover>
    <div class="sb-command__search">
      <Spinner v-if="loading" class="sb-command__search-icon" />
      <component
        :is="adapters.icon"
        v-else
        name="i-lucide-search"
        class="sb-command__search-icon"
      />
      <ListboxFilter
        v-model="searchTerm"
        class="sb-command__input"
        :placeholder="placeholder"
        auto-focus
      />
    </div>
    <ListboxContent class="sb-command__list">
      <p v-if="visibleGroups.length === 0" class="sb-command__empty">{{ empty }}</p>
      <ListboxGroup v-for="group in visibleGroups" :key="group.id" class="sb-command__group">
        <ListboxGroupLabel class="sb-command__heading">{{ group.label }}</ListboxGroupLabel>
        <ListboxItem
          v-for="item in group.items"
          :key="item.id"
          :value="item.id"
          class="sb-command__item"
          @select="item.onSelect"
        >
          <Spinner v-if="item.loading" class="sb-command__icon" />
          <img
            v-else-if="item.image"
            :src="item.image"
            alt=""
            class="sb-command__image"
            loading="lazy"
          />
          <component
            :is="adapters.icon"
            v-else-if="item.icon"
            :name="item.icon"
            class="sb-command__icon"
          />
          <span class="sb-command__label">{{ item.label }}</span>
          <span v-if="item.suffix" class="sb-command__suffix">{{ item.suffix }}</span>
        </ListboxItem>
      </ListboxGroup>
    </ListboxContent>
  </ListboxRoot>
</template>

<style scoped>
@layer components {
  .sb-command {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  }

  .sb-command__search {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0 0.75rem;
    border-bottom: 1px solid var(--sb-border);
  }

  .sb-command__search-icon {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    color: var(--sb-text-dimmed);
  }

  .sb-command__input {
    flex: 1;
    min-width: 0;
    height: 3rem;
    border: 0;
    background: none;
    color: var(--sb-text-highlighted);
    font: inherit;
    font-size: 1rem;
    outline: none;
  }

  @media (width >= 48rem) {
    .sb-command__input {
      font-size: 0.875rem;
    }
  }

  .sb-command__input::placeholder {
    color: var(--sb-text-dimmed);
  }

  .sb-command__list {
    flex: 1;
    overflow-y: auto;
    padding: 0.25rem;
  }

  .sb-command__empty {
    margin: 0;
    padding: 1.5rem 0.75rem;
    color: var(--sb-text-muted);
    font-size: 0.875rem;
    text-align: center;
  }

  .sb-command__group + .sb-command__group {
    margin-top: 0.25rem;
    padding-top: 0.25rem;
    border-top: 1px solid var(--sb-border);
  }

  .sb-command__heading {
    padding: 0.375rem 0.5rem 0.25rem;
    color: var(--sb-text-highlighted);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .sb-command__item {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    min-height: 2rem;
    padding: 0.25rem 0.5rem;
    color: var(--sb-text);
    font-size: 0.875rem;
    cursor: pointer;
    outline: none;
    user-select: none;
  }

  .sb-command__item[data-highlighted] {
    background: var(--sb-bg-elevated);
    color: var(--sb-text-highlighted);
  }

  .sb-command__icon {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    color: var(--sb-text-dimmed);
  }

  .sb-command__image {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    object-fit: contain;
  }

  .sb-command__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sb-command__suffix {
    overflow: hidden;
    color: var(--sb-text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
