import { fetchProfile, useAuthHydrated } from "~/composables/user";

/**
 * Restore the session after hydration when SWR-cached SSR stamped `user = null`
 * (Nitro SWR ignores cookies).
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
 * `useRuntimeConfig()` which requires setup context. Create the client during
 * plugin setup and hand it to `fetchProfile`.
 */
export default defineNuxtPlugin(() => {
  const user = useUser();
  const authHydrated = useAuthHydrated();
  const api = createApiClient();

  onNuxtReady(async () => {
    if (authHydrated.value) {
      return;
    }

    try {
      user.value = await fetchProfile(api);
    } catch {
      if (user.value === undefined) {
        user.value = null;
      }
    } finally {
      authHydrated.value = true;
    }
  });
});
