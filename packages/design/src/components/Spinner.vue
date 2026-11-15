<template>
  <svg
    class="sb-spinner"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
</template>

<style scoped>
.sb-spinner {
  flex-shrink: 0;
  animation: sb-spin 1s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .sb-spinner {
    animation-duration: 3s;
  }
}
</style>
