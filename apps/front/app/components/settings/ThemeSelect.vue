<script setup lang="ts">
const colorMode = useColorMode();
const { t } = useI18n();

const nextTheme = computed(() => (colorMode.value === "dark" ? "light" : "dark"));

const themeAriaLabel = computed(() =>
  t("components.settings.theme.switchTo", { mode: nextTheme.value }),
);

const switchTheme = () => {
  colorMode.preference = nextTheme.value;
};

const startViewTransition = (event: MouseEvent) => {
  if (!document.startViewTransition) {
    switchTheme();
    return;
  }

  const x = event.clientX;
  const y = event.clientY;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = document.startViewTransition(() => {
    switchTheme();
  });

  transition.ready.then(() => {
    const duration = 600;
    document.documentElement.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
      },
      {
        duration: duration,
        easing: "cubic-bezier(.76,.32,.29,.99)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  });
};
</script>

<template>
  <ClientOnly>
    <UButton
      class="rounded-full w-fit"
      variant="ghost"
      color="neutral"
      :icon="
        colorMode.value === 'dark'
          ? 'i-fluent-weather-moon-24-regular'
          : 'i-fluent-weather-sunny-24-regular'
      "
      size="md"
      :aria-label="themeAriaLabel"
      @click="startViewTransition"
    />

    <template #fallback>
      <UButton
        class="rounded-full"
        icon="i-fluent-weather-moon-24-regular"
        size="md"
        color="neutral"
        :aria-label="themeAriaLabel"
      />
    </template>
  </ClientOnly>
</template>

<style>
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-new(root) {
  z-index: var(--z-view-transition);
}
::view-transition-old(root) {
  z-index: var(--z-base);
}
</style>
