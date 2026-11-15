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
    <path d="M12 6 12 2" />
    <path d="M15.86 7.4 18.43 4.34" />
    <path d="M17.91 10.96 21.85 10.26" />
    <path d="M17.2 15 20.66 17" />
    <path d="M14.05 17.64 15.42 21.4" />
    <path d="M9.95 17.64 8.58 21.4" />
    <path d="M6.8 15 3.34 17" />
    <path d="M6.09 10.96 2.15 10.26" />
    <path d="M8.14 7.4 5.57 4.34" />
  </svg>
</template>

<style scoped>
@layer components {
  .sb-spinner {
    flex-shrink: 0;
    animation: sb-spin 1.2s linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .sb-spinner {
      animation-duration: 3s;
    }
  }
}
</style>
