<script setup lang="ts">
const { label = null, orientation = "horizontal" } = defineProps<{
  label?: string | null;
  orientation?: "horizontal" | "vertical";
}>();
</script>

<template>
  <div
    class="sb-separator"
    role="separator"
    :aria-orientation="orientation"
    :data-orientation="orientation"
    :data-labelled="label !== null || undefined"
  >
    <span v-if="label !== null" class="sb-separator__label">{{ label }}</span>
  </div>
</template>

<style scoped>
@layer components {
  .sb-separator {
    width: 100%;
    border-top: 1px solid var(--sb-border);
  }

  .sb-separator[data-orientation="vertical"] {
    width: auto;
    height: 100%;
    border-top: 0;
    border-inline-start: 1px solid var(--sb-border);
  }

  .sb-separator[data-labelled] {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    border-top: 0;
  }

  .sb-separator[data-labelled]::before,
  .sb-separator[data-labelled]::after {
    content: "";
    flex: 1;
    border-top: 1px solid var(--sb-border);
  }

  .sb-separator[data-orientation="vertical"][data-labelled] {
    flex-direction: column;
    border-inline-start: 0;
  }

  .sb-separator[data-orientation="vertical"][data-labelled]::before,
  .sb-separator[data-orientation="vertical"][data-labelled]::after {
    border-top: 0;
    border-inline-start: 1px solid var(--sb-border);
  }

  .sb-separator__label {
    color: var(--sb-text-highlighted);
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
  }
}
</style>
