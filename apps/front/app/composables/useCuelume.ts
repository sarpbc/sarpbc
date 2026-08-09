import { bind, play, setEnabled, setVolume, type SoundName } from "cuelume";

/**
 * Declarative interaction sounds via Cuelume (`data-cuelume-*` on controls).
 * Call `initCuelume()` once on the client (see `app/plugins/cuelume.client.ts`).
 *
 * @example
 * ```vue
 * <UButton type="submit" v-bind="cuelumeAttrs.pressRelease">Save</UButton>
 * <ULink :to="path" v-bind="cuelumeAttrs.hoverTick">Matches</ULink>
 * <UButton v-bind="cuelumeAttrs.toggle" @click="toggle">Dark mode</UButton>
 * ```
 *
 * @example
 * ```ts
 * const { playCue } = useCuelume();
 * playCue("success");
 * ```
 */
export const cuelumeAttrs = {
  /** Primary buttons — pointer down/up pair. */
  pressRelease: {
    "data-cuelume-press": "",
    "data-cuelume-release": "",
  },
  /** Nav links — fine-pointer hover tick (ignored on touch). */
  hoverTick: {
    "data-cuelume-hover": "tick",
  },
  /** Two-state controls (theme, tabs). */
  toggle: {
    "data-cuelume-toggle": "",
  },
} as const;

let initialized = false;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Client-only: bind delegated listeners and apply volume / reduced-motion guard. */
export function initCuelume(root?: ParentNode): void {
  if (initialized || typeof window === "undefined") {
    return;
  }

  initialized = true;
  setVolume(0.7);
  setEnabled(!prefersReducedMotion());
  bind(root);

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onMotionChange = () => {
    setEnabled(!motionQuery.matches);
  };
  motionQuery.addEventListener("change", onMotionChange);
}

export function useCuelume() {
  return {
    attrs: cuelumeAttrs,
    playCue(name: SoundName) {
      play(name);
    },
  };
}
