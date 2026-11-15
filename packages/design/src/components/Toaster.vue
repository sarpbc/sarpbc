<script setup lang="ts">
import {
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from "reka-ui";

import { useDesignAdapters } from "../adapters.ts";
import { dismissToast, toasts } from "../toast.ts";

const adapters = useDesignAdapters();

const ICONS = {
  danger: "i-lucide-circle-x",
  info: "i-lucide-info",
  success: "i-lucide-circle-check",
  warning: "i-lucide-triangle-alert",
} as const;
</script>

<template>
  <ToastProvider :duration="5000" swipe-direction="right">
    <slot />
    <ToastRoot
      v-for="toast in toasts"
      :key="toast.id"
      class="sb-toast"
      :data-color="toast.color"
      @update:open="(open) => open || dismissToast(toast.id)"
    >
      <component :is="adapters.icon" :name="ICONS[toast.color]" class="sb-toast__icon" />
      <div class="sb-toast__text">
        <ToastTitle class="sb-toast__title">{{ toast.title }}</ToastTitle>
        <ToastDescription v-if="toast.description" class="sb-toast__description">
          {{ toast.description }}
        </ToastDescription>
      </div>
      <ToastClose class="sb-toast__close" :aria-label="adapters.translate('close')">
        <component :is="adapters.icon" name="i-lucide-x" class="sb-toast__close-icon" />
      </ToastClose>
    </ToastRoot>
    <ToastViewport class="sb-toaster" />
  </ToastProvider>
</template>

<style>
/* Not scoped: Reka teleports each toast into the viewport, which drops the scope attribute. */
@layer components {
  .sb-toaster {
    position: fixed;
    z-index: 100;
    right: 1rem;
    bottom: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: min(24rem, calc(100vw - 2rem));
    margin: 0;
    padding: 0;
    list-style: none;
    outline: none;
  }

  .sb-toast {
    --tone: var(--sb-primary);

    display: flex;
    gap: 0.625rem;
    align-items: flex-start;
    padding: 0.75rem;
    background: var(--sb-bg);
    box-shadow:
      inset 0 0 0 1px var(--sb-border),
      0 4px 12px rgb(0 0 0 / 0.15);
    animation: sb-slide-in-right var(--sb-duration-fast) var(--sb-ease-out);
  }

  .sb-toast[data-swipe="move"] {
    translate: var(--reka-toast-swipe-move-x) 0;
  }

  .sb-toast[data-color="success"] {
    --tone: var(--sb-success);
  }

  .sb-toast[data-color="warning"] {
    --tone: var(--sb-warning);
  }

  .sb-toast[data-color="danger"] {
    --tone: var(--sb-error);
  }

  .sb-toast__icon {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    color: var(--tone);
  }

  .sb-toast__text {
    flex: 1;
    min-width: 0;
  }

  .sb-toast__title {
    color: var(--sb-text-highlighted);
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
  }

  .sb-toast__description {
    margin-top: 0.125rem;
    color: var(--sb-text-muted);
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .sb-toast__close {
    display: flex;
    flex-shrink: 0;
    padding: 0;
    border: 0;
    background: none;
    color: var(--sb-text-dimmed);
    cursor: pointer;
  }

  @media (hover: hover) {
    .sb-toast__close:hover {
      color: var(--sb-text-highlighted);
    }
  }

  .sb-toast__close-icon {
    width: 1rem;
    height: 1rem;
  }
}
</style>
