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
  danger?: boolean;
  disabled?: boolean;
  icon?: string | null;
  label?: string | null;
  loading?: boolean;
  size?: ButtonSize;
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
const hasLeading = computed(() => loading || icon !== null || slots.leading !== undefined);
const hasTrailing = computed(() => trailingIcon !== null || slots.trailing !== undefined);

const onClick = (event: MouseEvent) => {
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
    :data-leading="hasLeading || undefined"
    :data-trailing="hasTrailing || undefined"
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
    /* Reset so state variables never leak in from an ancestor. */
    --fill: transparent;
    --fill-hover: initial;
    --ink: var(--sb-text);
    --ring: none;

    /*
     * Sizes change the height and side padding only; the text and icons stay
     * the same, so a sm and a md button read as one family.
     */
    display: inline-flex;
    flex-shrink: 0;
    gap: 0.375rem;
    align-items: center;
    height: 1.75rem;
    padding: 0 0.625rem;
    border: 0;
    border-radius: 0;
    background: var(--fill);
    box-shadow: var(--ring);
    color: var(--ink);
    font: inherit;
    font-size: var(--sb-control-text);
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
    gap: 0.25rem;
    height: 1.5rem;
    padding: 0 0.5rem;
  }

  /* An icon carries its own optical margin, so its side needs less padding. */
  .sb-button[data-leading] {
    padding-inline-start: 0.375rem;
  }

  .sb-button[data-trailing] {
    padding-inline-end: 0.375rem;
  }

  .sb-button[data-square] {
    justify-content: center;
    width: 1.75rem;
    padding: 0;
  }

  .sb-button[data-square][data-size="sm"] {
    width: 1.5rem;
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
    width: 1rem;
    height: 1rem;
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
