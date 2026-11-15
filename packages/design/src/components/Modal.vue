<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  VisuallyHidden,
} from "reka-ui";

import { useDesignAdapters } from "../adapters.ts";

import type { ModalSize } from "../types.ts";

import Button from "./Button.vue";

const open = defineModel<boolean>("open", { default: false });

const {
  description = null,
  dismissible = true,
  size = "md",
  title,
} = defineProps<{
  description?: string | null;
  /** False keeps it open on outside clicks and Escape, e.g. while saving. */
  dismissible?: boolean;
  size?: ModalSize;
  /** Always set: screen readers announce it, even when `content` replaces the header. */
  title: string;
}>();

const adapters = useDesignAdapters();

const keepOpen = (event: Event): void => {
  if (!dismissible) {
    event.preventDefault();
  }
};
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger v-if="$slots.default" as-child>
      <slot />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="sb-modal__overlay" />
      <DialogContent
        class="sb-modal"
        :data-size="size"
        @interact-outside="keepOpen"
        @escape-key-down="keepOpen"
      >
        <template v-if="$slots.content">
          <VisuallyHidden>
            <DialogTitle>{{ title }}</DialogTitle>
            <DialogDescription v-if="description !== null">{{ description }}</DialogDescription>
          </VisuallyHidden>
          <slot name="content" />
        </template>
        <template v-else>
          <header class="sb-modal__header">
            <div class="sb-modal__heading">
              <DialogTitle class="sb-modal__title">{{ title }}</DialogTitle>
              <DialogDescription v-if="description !== null" class="sb-modal__description">
                {{ description }}
              </DialogDescription>
            </div>
            <DialogClose v-if="dismissible" as-child>
              <Button
                variant="tertiary"
                icon="i-lucide-x"
                :aria-label="adapters.translate('close')"
              />
            </DialogClose>
          </header>
          <div v-if="$slots.body" class="sb-modal__body">
            <slot name="body" />
          </div>
          <footer v-if="$slots.footer" class="sb-modal__footer">
            <slot name="footer" />
          </footer>
        </template>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
/* Not scoped: Reka renders the content through a portal, which drops the scope attribute. */
@layer components {
  .sb-modal__overlay {
    position: fixed;
    z-index: 50;
    inset: 0;
    background: color-mix(in oklab, var(--sb-bg-elevated) 75%, transparent);
    animation: sb-fade-in var(--sb-duration-fast) var(--sb-ease-out);
  }

  .sb-modal {
    position: fixed;
    z-index: 50;
    inset: 1rem 1rem auto;
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 2rem);
    margin-inline: auto;
    background: var(--sb-bg);
    box-shadow:
      inset 0 0 0 1px var(--sb-border),
      0 10px 30px rgb(0 0 0 / 0.2);
    animation: sb-fade-in var(--sb-duration-fast) var(--sb-ease-out);
  }

  @media (width >= 40rem) {
    .sb-modal {
      top: 50%;
      max-width: 32rem;
      translate: 0 -50%;
    }

    .sb-modal[data-size="lg"] {
      max-width: 42rem;
    }

    .sb-modal[data-size="xl"] {
      max-width: 48rem;
    }

    .sb-modal[data-size="2xl"] {
      max-width: 56rem;
    }
  }

  .sb-modal:focus-visible {
    outline: none;
  }

  .sb-modal__header {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--sb-border);
  }

  .sb-modal__heading {
    min-width: 0;
  }

  .sb-modal__title {
    margin: 0;
    color: var(--sb-text-highlighted);
    font-size: 1rem;
    font-weight: 500;
    line-height: 1.75rem;
  }

  .sb-modal__description {
    margin: 0.25rem 0 0;
    color: var(--sb-text-muted);
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .sb-modal__body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .sb-modal__footer {
    display: flex;
    gap: 0.375rem;
    align-items: center;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--sb-border);
  }

  @media (width >= 40rem) {
    .sb-modal__header,
    .sb-modal__body,
    .sb-modal__footer {
      padding-inline: 1.5rem;
    }

    .sb-modal__body {
      padding-block: 1.5rem;
    }
  }
}
</style>
