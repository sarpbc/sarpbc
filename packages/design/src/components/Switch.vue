<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from "reka-ui";
import { computed, useId } from "vue";

const model = defineModel<boolean>({ default: false });

const {
  description = null,
  disabled = false,
  label = null,
} = defineProps<{
  description?: string | null;
  disabled?: boolean;
  label?: string | null;
}>();

const id = useId();
const descriptionId = `${id}-description`;

const describedBy = computed(() => (description === null ? undefined : descriptionId));
</script>

<template>
  <span class="sb-switch">
    <SwitchRoot
      :id="id"
      v-model="model"
      :disabled="disabled"
      class="sb-switch__track"
      :aria-describedby="describedBy"
    >
      <SwitchThumb class="sb-switch__thumb" />
    </SwitchRoot>
    <span v-if="label !== null || description !== null" class="sb-switch__text">
      <label v-if="label !== null" :for="id" class="sb-switch__label">{{ label }}</label>
      <span v-if="description !== null" :id="descriptionId" class="sb-switch__description">
        {{ description }}
      </span>
    </span>
  </span>
</template>

<style scoped>
@layer components {
  .sb-switch {
    display: inline-flex;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .sb-switch__track {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    width: 1.75rem;
    height: 1rem;
    margin-top: 0.125rem;
    padding: 0.125rem;
    border: 0;
    border-radius: 999px;
    background: var(--sb-bg-accented);
    cursor: pointer;
    transition: background-color var(--sb-duration-fast);
  }

  .sb-switch__track[data-state="checked"] {
    background: var(--sb-primary);
  }

  .sb-switch__track:focus-visible {
    outline: 1px solid var(--sb-primary);
    outline-offset: 2px;
  }

  .sb-switch__track:disabled {
    opacity: 0.75;
    cursor: not-allowed;
  }

  .sb-switch__thumb {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background: var(--sb-bg);
    transition: translate var(--sb-duration-fast) var(--sb-ease-out);
  }

  .sb-switch__thumb[data-state="checked"] {
    translate: 0.75rem 0;
  }

  .sb-switch__text {
    display: flex;
    flex-direction: column;
  }

  .sb-switch__label {
    color: var(--sb-text-highlighted);
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
    cursor: pointer;
  }

  .sb-switch__description {
    color: var(--sb-text-muted);
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
}
</style>
