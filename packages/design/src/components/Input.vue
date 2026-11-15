<script setup lang="ts">
import { computed, useAttrs } from "vue";

import { useDesignAdapters } from "../adapters.ts";
import { useFormField } from "../form-field.ts";

import Spinner from "./Spinner.vue";

defineOptions({ inheritAttrs: false });

const model = defineModel<string | number | null>({ default: null });

const {
  icon = null,
  id = null,
  loading = false,
  trailingIcon = null,
  type = "text",
} = defineProps<{
  icon?: string | null;
  id?: string | null;
  loading?: boolean;
  trailingIcon?: string | null;
  type?: "text" | "email" | "password" | "search" | "url" | "tel" | "number";
}>();

const attrs = useAttrs();
const adapters = useDesignAdapters();
const field = useFormField();

const invalid = computed(() => field?.invalid.value ?? false);
const leading = computed(() => loading || icon !== null);

/* Layout classes size the wrapper; every other attribute belongs to the native input. */
const inputAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== "class")),
);
</script>

<template>
  <div class="sb-input" :class="attrs.class">
    <input
      v-bind="inputAttrs"
      :id="id ?? field?.id"
      v-model="model"
      class="sb-input__field"
      :type="type"
      :data-leading="leading || undefined"
      :data-trailing="trailingIcon !== null || undefined"
      :aria-invalid="invalid || undefined"
      :aria-describedby="field?.describedBy.value"
    />
    <span v-if="leading" class="sb-input__adornment sb-input__adornment--leading">
      <Spinner v-if="loading" class="sb-input__icon" />
      <component
        :is="adapters.icon"
        v-else-if="icon !== null"
        :name="icon"
        class="sb-input__icon"
      />
    </span>
    <span v-if="trailingIcon !== null" class="sb-input__adornment sb-input__adornment--trailing">
      <component :is="adapters.icon" :name="trailingIcon" class="sb-input__icon" />
    </span>
  </div>
</template>

<style scoped>
/* One look: a hairline field that rings in primary on focus and in error when invalid. */
@layer components {
  .sb-input {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .sb-input__field {
    --focus-tone: var(--sb-primary);

    width: 100%;
    /* 28px tall, aligned with a md button. */
    padding: 0.25rem 0.625rem;
    border: 0;
    border-radius: 0;
    appearance: none;
    background: var(--sb-bg);
    box-shadow: inset 0 0 0 1px var(--sb-border);
    color: var(--sb-text-highlighted);
    font: inherit;
    font-size: 1rem;
    line-height: 1.25rem;
    transition-property: color, background-color, box-shadow;
    transition-duration: var(--sb-duration-fast);
  }

  @media (width >= 48rem) {
    .sb-input__field {
      font-size: var(--sb-control-text);
    }
  }

  .sb-input__field::placeholder {
    color: var(--sb-text-dimmed);
  }

  @media (hover: hover) {
    .sb-input__field:hover:enabled:not(:focus-visible, [aria-invalid="true"]) {
      box-shadow: inset 0 0 0 1px var(--sb-border-accented);
    }
  }

  .sb-input__field:focus-visible {
    /* The border color alone marks focus; no halo. */
    outline: none;
    box-shadow: inset 0 0 0 1px var(--focus-tone);
  }

  .sb-input__field:disabled {
    opacity: 0.75;
    cursor: not-allowed;
  }

  .sb-input__field[aria-invalid="true"] {
    --focus-tone: var(--sb-error);

    box-shadow: inset 0 0 0 1px var(--sb-error);
  }

  .sb-input__field[data-leading] {
    padding-inline-start: 2rem;
  }

  .sb-input__field[data-trailing] {
    padding-inline-end: 2rem;
  }

  .sb-input__adornment {
    position: absolute;
    inset-block: 0;
    display: flex;
    align-items: center;
    color: var(--sb-text-dimmed);
    pointer-events: none;
  }

  .sb-input__adornment--leading {
    inset-inline-start: 0;
    padding-inline-start: 0.625rem;
  }

  .sb-input__adornment--trailing {
    inset-inline-end: 0;
    padding-inline-end: 0.625rem;
  }

  .sb-input__icon {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
  }
}
</style>
