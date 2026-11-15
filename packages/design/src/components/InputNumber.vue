<script setup lang="ts">
import {
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldRoot,
} from "reka-ui";
import { computed } from "vue";

import { useDesignAdapters } from "../adapters.ts";
import { useFormField } from "../form-field.ts";

defineOptions({ inheritAttrs: false });

const model = defineModel<number | null>({ default: null });

const {
  disabled = false,
  grouping = true,
  id = null,
  max = null,
  min = null,
  step = 1,
} = defineProps<{
  disabled?: boolean;
  /** Thousands separators; turn them off for years and identifiers. */
  grouping?: boolean;
  id?: string | null;
  max?: number | null;
  min?: number | null;
  step?: number;
}>();

const adapters = useDesignAdapters();
const field = useFormField();

const formatOptions = computed(() => ({ useGrouping: grouping }));
</script>

<template>
  <NumberFieldRoot
    v-model="model"
    class="sb-input-number"
    :class="$attrs.class"
    :min="min ?? undefined"
    :max="max ?? undefined"
    :step="step"
    :disabled="disabled"
    :format-options="formatOptions"
  >
    <NumberFieldDecrement class="sb-input-number__step">
      <component :is="adapters.icon" name="i-lucide-minus" class="sb-input-number__icon" />
    </NumberFieldDecrement>
    <NumberFieldInput
      :id="id ?? field?.id"
      class="sb-input-number__field"
      :aria-invalid="field?.invalid.value || undefined"
      :aria-describedby="field?.describedBy.value"
    />
    <NumberFieldIncrement class="sb-input-number__step">
      <component :is="adapters.icon" name="i-lucide-plus" class="sb-input-number__icon" />
    </NumberFieldIncrement>
  </NumberFieldRoot>
</template>

<style scoped>
@layer components {
  .sb-input-number {
    --focus-tone: var(--sb-primary);

    display: inline-flex;
    align-items: center;
    height: 1.75rem;
    background: var(--sb-bg);
    box-shadow: inset 0 0 0 1px var(--sb-border);
    transition: box-shadow var(--sb-duration-fast);
  }

  @media (hover: hover) {
    .sb-input-number:hover:not(:focus-within, [data-disabled]) {
      box-shadow: inset 0 0 0 1px var(--sb-border-accented);
    }
  }

  .sb-input-number:focus-within {
    box-shadow: inset 0 0 0 1px var(--focus-tone);
  }

  .sb-input-number:has([aria-invalid="true"]) {
    --focus-tone: var(--sb-error);

    box-shadow: inset 0 0 0 1px var(--sb-error);
  }

  .sb-input-number[data-disabled] {
    opacity: 0.75;
  }

  .sb-input-number__field {
    flex: 1;
    /* Like SInput: without it the field's intrinsic 20ch keeps the control from shrinking. */
    width: 100%;
    min-width: 0;
    height: 100%;
    padding: 0 0.25rem;
    border: 0;
    background: none;
    color: var(--sb-text-highlighted);
    font: inherit;
    font-size: 1rem;
    font-variant-numeric: tabular-nums;
    text-align: center;
    outline: none;
  }

  @media (width >= 48rem) {
    .sb-input-number__field {
      font-size: var(--sb-control-text);
    }
  }

  .sb-input-number__step {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 100%;
    padding: 0;
    border: 0;
    background: none;
    color: var(--sb-text-dimmed);
    cursor: pointer;
  }

  @media (hover: hover) {
    .sb-input-number__step:hover:enabled {
      color: var(--sb-text-highlighted);
    }
  }

  .sb-input-number__step:disabled {
    cursor: not-allowed;
  }

  .sb-input-number__icon {
    width: 1rem;
    height: 1rem;
  }
}
</style>
