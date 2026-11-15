<script setup lang="ts">
import { computed, useSlots } from "vue";

import { useDesignAdapters } from "../adapters.ts";

import type { ButtonSize, ButtonVariant } from "../types.ts";

import Spinner from "./Spinner.vue";

const {
  block = false,
  danger = false,
  disabled = false,
  icon = null,
  label = null,
  loading = false,
  size = "md",
  to = null,
  trailingIcon = null,
  type = "button",
  variant = "primary",
} = defineProps<{
  block?: boolean;
  /** Destructive action: the only color change a button allows. */
  danger?: boolean;
  disabled?: boolean;
  /** Leading icon name, rendered by the app's icon adapter. */
  icon?: string | null;
  label?: string | null;
  loading?: boolean;
  size?: ButtonSize;
  /**
   * Renders the app's link adapter instead of a <button>. Objects are route
   * locations, which only the app's router understands.
   */
  to?: string | object | null;
  trailingIcon?: string | null;
  type?: "button" | "submit" | "reset";
  variant?: ButtonVariant;
}>();

const emit = defineEmits<{ click: [event: MouseEvent] }>();

const slots = useSlots();
const adapters = useDesignAdapters();

const hasLabel = computed(() => label !== null || slots.default !== undefined);
const isLink = computed(() => to !== null);

/* A link cannot be disabled natively, so a disabled one swallows the click. */
const onClick = (event: MouseEvent): void => {
  if (isLink.value && disabled) {
    event.preventDefault();

    return;
  }

  emit("click", event);
};
</script>

<template>
  <component
    :is="isLink ? adapters.link : 'button'"
    class="sb-button"
    :data-variant="variant"
    :data-size="size"
    :data-danger="danger || undefined"
    :data-block="block || undefined"
    :data-square="!hasLabel || undefined"
    :to="to ?? undefined"
    :type="isLink ? undefined : type"
    :disabled="isLink ? undefined : disabled || loading"
    :aria-disabled="isLink && disabled ? 'true' : undefined"
    :aria-busy="loading || undefined"
    @click="onClick"
  >
    <slot name="leading">
      <Spinner v-if="loading" class="sb-button__icon" />
      <component
        :is="adapters.icon"
        v-else-if="icon !== null"
        :name="icon"
        class="sb-button__icon"
      />
    </slot>
    <span v-if="hasLabel" class="sb-button__label">
      <slot>{{ label }}</slot>
    </span>
    <slot name="trailing">
      <component
        :is="adapters.icon"
        v-if="trailingIcon !== null"
        :name="trailingIcon"
        class="sb-button__icon sb-button__icon--trailing"
      />
    </slot>
  </component>
</template>

<style scoped>
/*
 * Three roles, one optional danger tone, two dense sizes. Each variant only
 * declares its fill, ink and ring; the shared rules apply hover, press and focus.
 */
@layer components {
  .sb-button {
    --tone: var(--sb-primary);
    --icon-size: 1.125rem;

    /* Reset so state variables never leak in from an ancestor. */
    --fill: transparent;
    --fill-hover: initial;
    --ink: var(--sb-text);
    --ring: none;

    display: inline-flex;
    gap: 0.3125rem;
    align-items: center;
    /*
     * md is sm scaled by 7/6: text is half the height (14px in 28px, 12px in
     * 24px) and horizontal padding is twice the vertical one.
     */
    padding: 0.25rem 0.5rem;
    border: 0;
    border-radius: 0;
    background: var(--fill);
    box-shadow: var(--ring);
    color: var(--ink);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
    text-decoration: none;
    cursor: pointer;
    transition-property: color, background-color, box-shadow;
    transition-duration: var(--sb-duration-fast);
    transition-timing-function: var(--sb-ease-out);
  }

  @media (hover: hover) {
    .sb-button:is(:enabled, a:not([aria-disabled="true"])):hover {
      background: var(--fill-hover, var(--fill));
    }
  }

  .sb-button:is(:enabled, a:not([aria-disabled="true"])):active {
    background: var(--fill-hover, var(--fill));
    transition: none;
  }

  .sb-button:focus-visible {
    outline: 1px solid var(--sb-primary);
    outline-offset: 2px;
  }

  .sb-button:disabled,
  .sb-button[aria-disabled="true"] {
    opacity: 0.75;
    cursor: not-allowed;
  }

  .sb-button[aria-busy="true"] {
    cursor: progress;
  }

  .sb-button[data-size="sm"] {
    --icon-size: 1rem;

    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    line-height: 1rem;
  }

  .sb-button[data-square] {
    padding: 0.3125rem;
  }

  .sb-button[data-square][data-size="sm"] {
    padding: 0.25rem;
  }

  .sb-button[data-block] {
    justify-content: center;
    width: 100%;
  }

  .sb-button__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sb-button__icon {
    flex-shrink: 0;
    width: var(--icon-size);
    height: var(--icon-size);
  }

  .sb-button[data-block] .sb-button__icon--trailing {
    margin-inline-start: auto;
  }

  .sb-button[data-danger] {
    --tone: var(--sb-error);
  }

  .sb-button[data-variant="primary"] {
    --fill: var(--tone);
    --fill-hover: color-mix(in oklab, var(--tone) 75%, transparent);
    --ink: var(--sb-text-inverted);
  }

  .sb-button[data-variant="secondary"] {
    --fill: var(--sb-bg);
    --fill-hover: var(--sb-bg-elevated);
    --ring: inset 0 0 0 1px var(--sb-border);
  }

  .sb-button[data-variant="secondary"][data-danger] {
    --fill: transparent;
    --fill-hover: color-mix(in oklab, var(--tone) 10%, transparent);
    --ink: var(--tone);
    --ring: inset 0 0 0 1px color-mix(in oklab, var(--tone) 50%, transparent);
  }

  .sb-button[data-variant="tertiary"] {
    --fill-hover: var(--sb-bg-elevated);
  }

  .sb-button[data-variant="tertiary"][data-danger] {
    --fill-hover: color-mix(in oklab, var(--tone) 10%, transparent);
    --ink: var(--tone);
  }
}
</style>
