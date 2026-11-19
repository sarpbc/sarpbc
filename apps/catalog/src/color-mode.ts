import { ref, watchEffect } from "vue";

export const COLOR_MODES = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export const colorMode = ref(matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

watchEffect(() => {
  document.documentElement.classList.toggle("dark", colorMode.value === "dark");
  document.documentElement.style.colorScheme = colorMode.value;
});
