import { useUser } from "~/composables/state";
import type { User } from "~/types/user";

/**
 * Restore the session after hydration when SWR-cached SSR stamped `user = null`
 * (Nitro SWR ignores cookies — see SAR-73).
 *
 * Uses `onNuxtReady`, which waits for `app:suspense:resolve` then an idle callback —
 * so we do not mutate `user` during hydration. Revalidating earlier (middleware /
 * `app:mounted`) mismatches SWR guest HTML against delayed layout islands
 * (`LazyForumPreview hydrate-on-idle`) and can take the page down.
 *
 * Auth-conditional UI inside those islands must also use `<ClientOnly>`
 * (see `ForumPreview`) so idle hydration cannot race this update.
 *
 * Do **not** call `getProfile()` / `apiFetch()` from `onNuxtReady`: those call
 * `useRuntimeConfig()` which requires setup context. Capture `apiBase` during
 * plugin setup and use plain `$fetch` in the idle callback.
 */
export default defineNuxtPlugin(() => {
  const user = useUser();
  const authHydrated = useState<boolean>("auth-hydrated", () => false);
  const apiBase = useRuntimeConfig().public.apiBase as string;

  onNuxtReady(async () => {
    if (authHydrated.value) {
      return;
    }

    try {
      const res = await $fetch<{ user?: User }>(`${apiBase}/user/profile`, {
        method: "GET",
        credentials: "include",
      });
      user.value = res.user ?? null;
    } catch {
      if (user.value === undefined) {
        user.value = null;
      }
    } finally {
      authHydrated.value = true;
    }
  });
});
