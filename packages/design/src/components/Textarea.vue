<script setup lang="ts">
import { computed, nextTick, onMounted, useAttrs, useTemplateRef, watch } from "vue";

import { useFormField } from "../form-field.ts";

defineOptions({ inheritAttrs: false });

const model = defineModel<string | null>({ default: null });

const {
  autoresize = false,
  id = null,
  rows = 3,
} = defineProps<{
  /** Grows with its content instead of scrolling. */
  autoresize?: boolean;
  id?: string | null;
  rows?: number;
}>();

const attrs = useAttrs();
const field = useFormField();
const textarea = useTemplateRef("textarea");

const invalid = computed(() => field?.invalid.value ?? false);

/* Layout classes size the wrapper; every other attribute belongs to the native textarea. */
const textareaAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== "class")),
);

const fitContent = async (): Promise<void> => {
  await nextTick();

  if (!autoresize || textarea.value === null) {
    return;
  }

  textarea.value.style.height = "auto";
  textarea.value.style.height = `${textarea.value.scrollHeight}px`;
};

onMounted(fitContent);

watch(model, fitContent);
</script>

<template>
  <div class="sb-textarea" :class="attrs.class">
    <textarea
      v-bind="textareaAttrs"
      :id="id ?? field?.id"
      ref="textarea"
      v-model="model"
      class="sb-textarea__field"
      :rows="rows"
      :data-autoresize="autoresize || undefined"
      :aria-invalid="invalid || undefined"
      :aria-describedby="field?.describedBy.value"
    />
  </div>
</template>

<style scoped>
/* Same surface as Input: a hairline field that rings in primary on focus and in error when invalid. */
@layer components {
  .sb-textarea {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .sb-textarea__field {
    --focus-tone: var(--sb-primary);

    width: 100%;
    /* 28px tall, aligned with a md button. */
    padding: 0.25rem 0.5rem;
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
    .sb-textarea__field {
      font-size: 0.875rem;
    }
  }

  .sb-textarea__field::placeholder {
    color: var(--sb-text-dimmed);
  }

  @media (hover: hover) {
    .sb-textarea__field:hover:enabled:not(:focus-visible, [aria-invalid="true"]) {
      box-shadow: inset 0 0 0 1px var(--sb-border-accented);
    }
  }

  .sb-textarea__field:focus-visible {
    /* The border color alone marks focus; no halo. */
    outline: none;
    box-shadow: inset 0 0 0 1px var(--focus-tone);
  }

  .sb-textarea__field:disabled {
    opacity: 0.75;
    cursor: not-allowed;
  }

  .sb-textarea__field[data-autoresize] {
    overflow: hidden;
    resize: none;
  }

  .sb-textarea__field[aria-invalid="true"] {
    --focus-tone: var(--sb-error);

    box-shadow: inset 0 0 0 1px var(--sb-error);
  }
}
</style>
