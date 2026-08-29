import { bind, play, setEnabled, setVolume, type SoundName } from "cuelume";

export const cuelumeAttrs = {
  pressRelease: {
    "data-cuelume-press": "",
    "data-cuelume-release": "",
  },
  toggle: {
    "data-cuelume-toggle": "",
  },
} as const;

/** Scale on `:active` only — transform does not affect layout flow. */
export const cuelumePressClass =
  "origin-center active:scale-[0.96] motion-reduce:active:scale-100 [transition-property:transform] duration-100 ease-out motion-reduce:transition-none";

let initialized = false;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
