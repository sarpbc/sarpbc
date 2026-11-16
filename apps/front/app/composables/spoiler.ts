import {
  NO_SPOILER_REVEALS,
  SPOILER_FREE_COOKIE,
  isSpoilerConcealed,
  revealSpoilers,
} from "@sarpbc/utils";
import type { SpoilerReveals, SpoilerRevealTarget, SpoilerScope } from "@sarpbc/utils";

export const useSpoilerFree = () => {
  const cookie = useCookie<boolean | null>(SPOILER_FREE_COOKIE, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const enabled = useState<boolean>(SPOILER_FREE_COOKIE, () => cookie.value === true);
  const reveals = useState<SpoilerReveals>("spoilerReveals", () => NO_SPOILER_REVEALS);

  watch(
    cookie,
    (value) => {
      enabled.value = value === true;
    },
    { flush: "sync", immediate: import.meta.client },
  );

  const isConcealed = (scope: SpoilerScope): boolean =>
    isSpoilerConcealed(enabled.value, reveals.value, scope);

  const reveal = (target: SpoilerRevealTarget) => {
    reveals.value = revealSpoilers(reveals.value, target);
  };

  return { enabled: readonly(enabled), isConcealed, reveal };
};
