<template>
  <div class="sb-skeleton" aria-hidden="true" />
</template>

<style scoped>
/* Callers size it. */
@layer components {
  .sb-skeleton {
    background: var(--sb-bg-elevated);
    animation: sb-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .sb-skeleton {
      animation: none;
    }
  }
}
</style>
