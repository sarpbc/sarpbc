<script setup lang="ts">
const colorMode = useColorMode();
const { t } = useI18n();

const nextTheme = computed(() => (colorMode.value === "dark" ? "light" : "dark"));

const themeAriaLabel = computed(() =>
  nextTheme.value === "light"
    ? t("components.footer.switchToLight")
    : t("components.footer.switchToDark"),
);

const switchTheme = () => {
  colorMode.preference = nextTheme.value;
};

const startViewTransition = (event: MouseEvent) => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!document.startViewTransition || reducedMotion) {
    switchTheme();
    return;
  }

  const x = event.clientX;
  const y = event.clientY;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const root = document.documentElement;
  root.classList.add("theme-transition");

  const transition = document.startViewTransition(() => {
    switchTheme();
  });

  const failSafe = window.setTimeout(() => {
    transition.skipTransition();
  }, 800);

  void transition.finished.finally(() => {
    window.clearTimeout(failSafe);
    root.classList.remove("theme-transition");
  });

  void transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
        },
        {
          duration: 400,
          easing: "cubic-bezier(0.77, 0, 0.175, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      transition.skipTransition();
    });
};
</script>

<template>
  <ClientOnly>
    <button
      type="button"
      class="flex text-muted transition-none hover:text-highlighted"
      :aria-label="themeAriaLabel"
      @click="startViewTransition"
    >
      <UIcon
        :name="
          colorMode.value === 'dark'
            ? 'i-fluent-weather-moon-24-regular'
            : 'i-fluent-weather-sunny-24-regular'
        "
        class="size-4"
        aria-hidden="true"
      />
    </button>

    <template #fallback>
      <span class="flex text-muted" aria-hidden="true">
        <UIcon name="i-fluent-weather-moon-24-regular" class="size-4" />
      </span>
    </template>
  </ClientOnly>
</template>

<style>
/* Scoped to the theme switch: route view transitions keep Nuxt's default root crossfade. */
.theme-transition::view-transition-old(root),
.theme-transition::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

.theme-transition::view-transition-new(root) {
  z-index: var(--z-view-transition);
}
.theme-transition::view-transition-old(root) {
  z-index: var(--z-base);
}
</style>
