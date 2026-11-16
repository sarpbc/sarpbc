<script setup lang="ts">
import { computed, provide, useId, useSlots } from "vue";

import { FORM_FIELD } from "../form-field.ts";

const {
  description = null,
  error = null,
  help = null,
  hint = null,
  label = null,
  required = false,
} = defineProps<{
  description?: string | null;
  /** Shown under the control and marks it invalid. */
  error?: string | null;
  help?: string | null;
  hint?: string | null;
  label?: string | null;
  required?: boolean;
}>();

const id = useId();
const descriptionId = `${id}-description`;
const messageId = `${id}-message`;

const slots = useSlots();

/* An error replaces the help text, whether it comes from the prop or the slot. */
const hasMessage = computed(() => error !== null || help !== null || slots.help !== undefined);

const describedBy = computed(() => {
  const ids = [description === null ? null : descriptionId, hasMessage.value ? messageId : null];

  const present = ids.filter((value) => value !== null);

  return present.length === 0 ? undefined : present.join(" ");
});

provide(FORM_FIELD, { describedBy, id, invalid: computed(() => error !== null) });
</script>

<template>
  <div class="sb-form-field">
    <div v-if="label !== null || hint !== null || $slots.label" class="sb-form-field__label-row">
      <label :for="id" class="sb-form-field__label" :data-required="required || undefined">
        <slot name="label">{{ label }}</slot>
      </label>
      <span v-if="hint !== null" class="sb-form-field__hint">{{ hint }}</span>
    </div>
    <p v-if="description !== null" :id="descriptionId" class="sb-form-field__description">
      {{ description }}
    </p>
    <div class="sb-form-field__control">
      <slot />
    </div>
    <p
      v-if="hasMessage"
      :id="messageId"
      class="sb-form-field__message"
      :data-error="error !== null || undefined"
    >
      <template v-if="error !== null">{{ error }}</template>
      <slot v-else name="help">{{ help }}</slot>
    </p>
  </div>
</template>

<style scoped>
@layer components {
  .sb-form-field {
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .sb-form-field__label-row {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    justify-content: space-between;
  }

  .sb-form-field__label {
    display: block;
    flex-shrink: 0;
    color: var(--sb-text);
    font-weight: 500;
  }

  .sb-form-field__label[data-required]::after {
    content: "*";
    margin-inline-start: 0.125rem;
    color: var(--sb-error);
  }

  .sb-form-field__hint,
  .sb-form-field__description {
    margin: 0;
    color: var(--sb-text-muted);
  }

  .sb-form-field__control {
    position: relative;
    margin-top: 0.25rem;
  }

  .sb-form-field__message {
    margin: 0.5rem 0 0;
    color: var(--sb-text-muted);
  }

  .sb-form-field__message[data-error] {
    color: var(--sb-error);
  }
}
</style>
