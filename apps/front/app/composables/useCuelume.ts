import { bind, play, setEnabled, setVolume, type SoundName } from "cuelume";

/**
 * Declarative interaction sounds via Cuelume (`data-cuelume-*` on controls).
 * Call `initCuelume()` once on the client (see `app/plugins/cuelume.client.ts`).
 *
 * Prefer press/release on rare actions (buttons). Do not attach hover ticks to
 * dense lists or nav — they become noise. Use `playCue("loading")` when
 * user-initiated async work starts.
 *
 * @example
 * ```vue
 * <SButton type="submit">Save</SButton>
 * <UButton v-bind="cuelumeAttrs.toggle" @click="toggle">Dark mode</UButton>
 * ```
 *
 * @example
 * ```ts
 * const { playCue } = useCuelume();
 * playCue("loading");
 * playCue("success");
 * ```
 */
export const cuelumeAttrs = {
  /** Primary buttons — pointer down/up pair. */
  pressRelease: {
    "data-cuelume-press": "",
    "data-cuelume-release": "",
  },
  /** Two-state controls (theme, tabs). */
  toggle: {
    "data-cuelume-toggle": "",
  },
} as const;

/** Transform-only press squash — does not affect layout flow. */
export const cuelumePressClass =
  "origin-center active:scale-[0.96] motion-reduce:active:scale-100 [transition-property:transform] duration-100 ease-out motion-reduce:transition-none";

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
    pressClass: cuelumePressClass,
    playCue(name: SoundName) {
      play(name);
    },
  };
}
