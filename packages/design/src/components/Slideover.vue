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
} from "reka-ui";

import { useDesignAdapters } from "../adapters.ts";

import Button from "./Button.vue";

const open = defineModel<boolean>("open", { default: false });

const {
  description = null,
  side = "right",
  title,
} = defineProps<{
  description?: string | null;
  side?: "left" | "right";
  title: string;
}>();

const adapters = useDesignAdapters();
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger v-if="$slots.default" as-child>
      <slot />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="sb-slideover__overlay" />
      <DialogContent class="sb-slideover" :data-side="side">
        <header class="sb-slideover__header">
          <div class="sb-slideover__heading">
            <DialogTitle class="sb-slideover__title">{{ title }}</DialogTitle>
            <DialogDescription v-if="description !== null" class="sb-slideover__description">
              {{ description }}
            </DialogDescription>
          </div>
          <DialogClose as-child>
            <Button
              variant="tertiary"
              icon="i-lucide-x"
              :aria-label="adapters.translate('close')"
            />
          </DialogClose>
        </header>
        <div class="sb-slideover__body">
          <slot name="body" />
        </div>
        <footer v-if="$slots.footer" class="sb-slideover__footer">
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
/* Not scoped: Reka renders the content through a portal, which drops the scope attribute. */
@layer components {
  .sb-slideover__overlay {
    position: fixed;
    z-index: 50;
    inset: 0;
    background: color-mix(in oklab, var(--sb-bg-elevated) 75%, transparent);
    animation: sb-fade-in var(--sb-duration-fast) var(--sb-ease-out);
  }

  .sb-slideover {
    position: fixed;
    z-index: 50;
    inset-block: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 18rem;
    background: var(--sb-bg);
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.2);
  }

  .sb-slideover:focus-visible {
    outline: none;
  }

  .sb-slideover[data-side="left"] {
    left: 0;
    border-inline-end: 1px solid var(--sb-border);
    animation: sb-slide-in-left var(--sb-duration-fast) var(--sb-ease-out);
  }

  .sb-slideover[data-side="right"] {
    right: 0;
    border-inline-start: 1px solid var(--sb-border);
    animation: sb-slide-in-right var(--sb-duration-fast) var(--sb-ease-out);
  }

  .sb-slideover__header {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--sb-border);
  }

  .sb-slideover__heading {
    min-width: 0;
  }

  .sb-slideover__title {
    margin: 0;
    color: var(--sb-text-highlighted);
    font-size: 1rem;
    font-weight: 500;
    line-height: 1.75rem;
  }

  .sb-slideover__description {
    margin: 0.25rem 0 0;
    color: var(--sb-text-muted);
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .sb-slideover__body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .sb-slideover__footer {
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--sb-border);
  }
}
</style>
