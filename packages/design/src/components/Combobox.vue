<script setup lang="ts" generic="T extends SelectValue, M extends boolean = false">
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from "reka-ui";
import { computed } from "vue";

import { useDesignAdapters } from "../adapters.ts";
import { useFormField } from "../form-field.ts";

import type { SelectOption, SelectValue } from "../types.ts";

import Spinner from "./Spinner.vue";

defineOptions({ inheritAttrs: false });

const model = defineModel<(M extends true ? T[] : T) | null>({ default: null });

/** What the user typed; bind it to search on the server and pass `remote`. */
const searchTerm = defineModel<string>("searchTerm", { default: "" });

const {
  disabled = false,
  icon = null,
  id = null,
  items,
  loading = false,
  multiple = null,
  placeholder = null,
  remote = false,
} = defineProps<{
  disabled?: boolean;
  icon?: string | null;
  id?: string | null;
  items: readonly SelectOption<T>[];
  loading?: boolean;
  multiple?: M | null;
  placeholder?: string | null;
  /** Items already match the search (fetched for it), so the list is not filtered again. */
  remote?: boolean;
}>();

const adapters = useDesignAdapters();
const field = useFormField();

const labelOf = (value: T): string => items.find((item) => item.value === value)?.label ?? "";

const isList = (value: T | readonly T[]): value is readonly T[] => Array.isArray(value);

const displayValue = (value: T | readonly T[] | null): string => {
  if (value === null) {
    return "";
  }

  return isList(value) ? value.map(labelOf).join(", ") : labelOf(value);
};

const leading = computed(() => icon !== null);
</script>

<template>
  <ComboboxRoot
    v-model="model"
    :multiple="multiple ?? false"
    :disabled="disabled"
    :ignore-filter="remote"
    :reset-search-term-on-blur="!remote"
  >
    <ComboboxAnchor class="sb-combobox" :class="$attrs.class">
      <component
        :is="adapters.icon"
        v-if="icon !== null"
        :name="icon"
        class="sb-combobox__icon sb-combobox__icon--leading"
      />
      <ComboboxInput
        :id="id ?? field?.id"
        v-model="searchTerm"
        class="sb-combobox__input"
        :data-leading="leading || undefined"
        :placeholder="placeholder ?? undefined"
        :display-value="displayValue"
        :aria-invalid="field?.invalid.value || undefined"
        :aria-describedby="field?.describedBy.value"
      />
      <Spinner v-if="loading" class="sb-combobox__icon sb-combobox__icon--trailing" />
      <ComboboxTrigger v-else class="sb-combobox__trigger">
        <component :is="adapters.icon" name="i-lucide-chevron-down" class="sb-combobox__icon" />
      </ComboboxTrigger>
    </ComboboxAnchor>
    <ComboboxPortal>
      <ComboboxContent class="sb-listbox" position="popper" :side-offset="4" :collision-padding="8">
        <ComboboxViewport>
          <ComboboxEmpty class="sb-listbox__empty">
            <slot name="empty" />
          </ComboboxEmpty>
          <ComboboxItem
            v-for="item in items"
            :key="String(item.value)"
            :value="item.value"
            :text-value="item.label"
            :disabled="item.disabled"
            class="sb-listbox__item"
          >
            <span class="sb-listbox__text">
              <span class="sb-listbox__label">{{ item.label }}</span>
              <span v-if="item.description" class="sb-listbox__description">
                {{ item.description }}
              </span>
            </span>
            <ComboboxItemIndicator class="sb-listbox__check">
              <component :is="adapters.icon" name="i-lucide-check" class="sb-listbox__icon" />
            </ComboboxItemIndicator>
          </ComboboxItem>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>

<style>
/* Not scoped: the list renders through a portal; its styles live in Select.vue (.sb-listbox). */
@layer components {
  .sb-combobox {
    --focus-tone: var(--sb-primary);

    position: relative;
    display: inline-flex;
    align-items: center;
    min-width: 0;
  }

  .sb-combobox__input {
    width: 100%;
    height: 1.75rem;
    padding: 0 2rem 0 0.625rem;
    border: 0;
    appearance: none;
    background: var(--sb-bg);
    box-shadow: inset 0 0 0 1px var(--sb-border);
    color: var(--sb-text-highlighted);
    font: inherit;
    font-size: 1rem;
    transition: box-shadow var(--sb-duration-fast);
  }

  @media (width >= 48rem) {
    .sb-combobox__input {
      font-size: var(--sb-control-text);
    }
  }

  .sb-combobox__input[data-leading] {
    padding-inline-start: 2rem;
  }

  .sb-combobox__input::placeholder {
    color: var(--sb-text-dimmed);
  }

  @media (hover: hover) {
    .sb-combobox__input:hover:enabled:not(:focus-visible, [aria-invalid="true"]) {
      box-shadow: inset 0 0 0 1px var(--sb-border-accented);
    }
  }

  .sb-combobox__input:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1px var(--focus-tone);
  }

  .sb-combobox__input[aria-invalid="true"] {
    --focus-tone: var(--sb-error);

    box-shadow: inset 0 0 0 1px var(--sb-error);
  }

  .sb-combobox__input:disabled {
    opacity: 0.75;
    cursor: not-allowed;
  }

  .sb-combobox__trigger {
    position: absolute;
    inset-inline-end: 0.375rem;
    display: flex;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  .sb-combobox__icon {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    color: var(--sb-text-dimmed);
  }

  .sb-combobox__icon--leading {
    position: absolute;
    inset-inline-start: 0.625rem;
    pointer-events: none;
  }

  .sb-combobox__icon--trailing {
    position: absolute;
    inset-inline-end: 0.375rem;
  }
}
</style>
