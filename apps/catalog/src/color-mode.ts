import { computed, ref, watchEffect } from "vue";

export const COLOR_MODES = ["system", "light", "dark"] as const;

export type ColorMode = (typeof COLOR_MODES)[number];

export const colorMode = ref<ColorMode>("system");

const prefersDark = ref(matchMedia("(prefers-color-scheme: dark)").matches);

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
  prefersDark.value = event.matches;
});

export const isDark = computed(() =>
  colorMode.value === "system" ? prefersDark.value : colorMode.value === "dark",
);

/* Same switch the apps use: a `.dark` class on <html>, plus color-scheme for the catalog chrome. */
watchEffect(() => {
  document.documentElement.classList.toggle("dark", isDark.value);
  document.documentElement.style.colorScheme = isDark.value ? "dark" : "light";
});
