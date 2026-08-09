import { initCuelume } from "~/composables/useCuelume";

/**
 * Wires Cuelume delegated listeners after hydration. Sounds only play after user
 * interaction (Web Audio autoplay policy). Disabled when `prefers-reduced-motion: reduce`.
 */
export default defineNuxtPlugin(() => {
  onNuxtReady(() => {
    initCuelume();
  });
});
