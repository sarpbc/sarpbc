<script setup lang="ts" generic="T extends SelectValue">
import {
  SelectContent,
  SelectGroup as SelectGroupRoot,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectPortal,
  SelectRoot,
  SelectSeparator,
  SelectTrigger,
  SelectValue as SelectedValue,
  SelectViewport,
} from "reka-ui";
import { computed } from "vue";

import { useDesignAdapters } from "../adapters.ts";
import { useFormField } from "../form-field.ts";

import type { SelectGroup, SelectOption, SelectValue } from "../types.ts";

import Spinner from "./Spinner.vue";

defineOptions({ inheritAttrs: false });

const {
  disabled = false,
  groups = null,
  id = null,
  items = null,
  loading = false,
  modelValue = null,
  placeholder = null,
} = defineProps<{
  disabled?: boolean;
  /** Options under headings; pass either `items` or `groups`. */
  groups?: readonly SelectGroup<T>[] | null;
  id?: string | null;
  items?: readonly SelectOption<T>[] | null;
  loading?: boolean;
  /** Null shows the placeholder; once chosen, a select never goes back to empty. */
  modelValue?: T | null;
  placeholder?: string | null;
}>();

const emit = defineEmits<{ "update:modelValue": [value: T] }>();

const adapters = useDesignAdapters();
const field = useFormField();

const sections = computed(
  (): readonly SelectGroup<T>[] => groups ?? [{ label: "", options: items ?? [] }],
);

const selectedLabel = computed(
  () =>
    sections.value.flatMap((section) => section.options).find((item) => item.value === modelValue)
      ?.label ?? null,
);
</script>

<template>
  <SelectRoot
    :model-value="modelValue ?? undefined"
    :disabled="disabled || loading"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <SelectTrigger
      :id="id ?? field?.id"
      class="sb-select"
      :aria-invalid="field?.invalid.value || undefined"
      :aria-describedby="field?.describedBy.value"
      v-bind="$attrs"
    >
      <SelectedValue class="sb-select__value" :placeholder="placeholder ?? ''">
        {{ selectedLabel ?? placeholder }}
      </SelectedValue>
      <Spinner v-if="loading" class="sb-select__icon" />
      <component :is="adapters.icon" v-else name="i-lucide-chevron-down" class="sb-select__icon" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent class="sb-listbox" position="popper" :side-offset="4" :collision-padding="8">
        <SelectViewport>
          <template v-for="(section, index) in sections" :key="index">
            <SelectSeparator v-if="index > 0" class="sb-listbox__separator" />
            <SelectGroupRoot>
              <SelectLabel v-if="section.label !== ''" class="sb-listbox__heading">
                {{ section.label }}
              </SelectLabel>
              <SelectItem
                v-for="item in section.options"
                :key="String(item.value)"
                :value="item.value"
                :disabled="item.disabled"
                class="sb-listbox__item"
              >
                <SelectItemText class="sb-listbox__label">{{ item.label }}</SelectItemText>
                <SelectItemIndicator class="sb-listbox__check">
                  <component :is="adapters.icon" name="i-lucide-check" class="sb-listbox__icon" />
                </SelectItemIndicator>
              </SelectItem>
            </SelectGroupRoot>
          </template>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style>
/* Not scoped: the list renders through a portal, which drops the scope attribute. */
@layer components {
  .sb-select {
    --focus-tone: var(--sb-primary);

    display: inline-flex;
    gap: 0.375rem;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    height: 1.75rem;
    padding: 0 0.375rem 0 0.625rem;
    border: 0;
    background: var(--sb-bg);
    box-shadow: inset 0 0 0 1px var(--sb-border);
    color: var(--sb-text-highlighted);
    font: inherit;
    font-size: 1rem;
    text-align: start;
    cursor: pointer;
    transition: box-shadow var(--sb-duration-fast);
  }

  @media (width >= 48rem) {
    .sb-select {
      font-size: var(--sb-control-text);
    }
  }

  @media (hover: hover) {
    .sb-select:hover:enabled:not(:focus-visible, [aria-invalid="true"]) {
      box-shadow: inset 0 0 0 1px var(--sb-border-accented);
    }
  }

  .sb-select:focus-visible,
  .sb-select[data-state="open"] {
    outline: none;
    box-shadow: inset 0 0 0 1px var(--focus-tone);
  }

  .sb-select[aria-invalid="true"] {
    --focus-tone: var(--sb-error);

    box-shadow: inset 0 0 0 1px var(--sb-error);
  }

  .sb-select:disabled {
    opacity: 0.75;
    cursor: not-allowed;
  }

  .sb-select__value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sb-select[data-placeholder] .sb-select__value {
    color: var(--sb-text-dimmed);
  }

  .sb-select__icon {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    color: var(--sb-text-dimmed);
  }

  /* Shared by Select and Combobox lists. */
  .sb-listbox {
    z-index: 50;
    min-width: var(--reka-select-trigger-width, var(--reka-combobox-trigger-width));
    max-height: min(20rem, var(--reka-select-content-available-height, 20rem));
    overflow-y: auto;
    padding: 0.25rem;
    background: var(--sb-bg);
    box-shadow:
      inset 0 0 0 1px var(--sb-border),
      0 4px 12px rgb(0 0 0 / 0.12);
    animation: sb-fade-in var(--sb-duration-fast) var(--sb-ease-out);
  }

  .sb-listbox__item {
    display: flex;
    gap: 0.375rem;
    align-items: center;
    justify-content: space-between;
    min-height: 1.75rem;
    padding: 0.25rem 0.375rem;
    color: var(--sb-text);
    font-size: var(--sb-control-text);
    line-height: 1.25rem;
    cursor: pointer;
    outline: none;
    user-select: none;
  }

  .sb-listbox__item[data-highlighted] {
    background: var(--sb-bg-elevated);
    color: var(--sb-text-highlighted);
  }

  .sb-listbox__item[data-state="checked"] {
    color: var(--sb-text-highlighted);
  }

  .sb-listbox__item[data-disabled] {
    opacity: 0.75;
    cursor: not-allowed;
  }

  .sb-listbox__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sb-listbox__text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .sb-listbox__description {
    overflow: hidden;
    color: var(--sb-text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sb-listbox__check {
    display: flex;
    flex-shrink: 0;
  }

  .sb-listbox__icon {
    width: 1rem;
    height: 1rem;
  }

  .sb-listbox__separator {
    height: 1px;
    margin: 0.25rem -0.25rem;
    background: var(--sb-border);
  }

  .sb-listbox__heading {
    padding: 0.375rem 0.375rem 0.25rem;
    color: var(--sb-text-highlighted);
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1rem;
  }

  .sb-listbox__empty {
    padding: 0.375rem;
    color: var(--sb-text-muted);
    font-size: var(--sb-control-text);
  }
}
</style>
