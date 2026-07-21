import { getCookie } from "h3";
import { useUser } from "~/composables/state";
import { getProfile } from "~/composables/user";

const ACCESS_TOKEN_COOKIE = "access_token";

/**
 * Global authentication middleware
 * Resolves session once per app load.
 * `undefined` = unknown, `null` = guest, `User` = authenticated.
 *
 * SSR skips the profile request when the httpOnly access_token cookie is absent.
 *
 * Nitro SWR routeRules ignore request cookies, so cached SSR can stamp `user = null`
 * even when a valid access_token cookie exists (see SAR-73). Do **not** revalidate
 * that stamp in this middleware on the client — mutating `user` before / during
 * hydration (especially with `Lazy*` + `hydrate-on-idle` in the default layout)
 * mismatches the SWR HTML and can crash the app. Post-hydrate revalidation lives in
 * `plugins/session-revalidate.client.ts` (`onNuxtReady` → after suspense + idle).
 *
 * Read the token with h3 `getCookie` (not `useCookie`) so Nuxt never tries to
 * re-serialize the httpOnly JWT into the payload / Set-Cookie.
 */
export default defineNuxtRouteMiddleware(async () => {
  const user = useUser();
  const authHydrated = useState<boolean>("auth-hydrated", () => false);

  if (user.value !== undefined) {
    return;
  }

  // Client-only routes / SPA entry with no SSR user in the payload.
  // Initial SSR payloads (including SWR `null`) are left untouched until
  // `session-revalidate.client` runs after hydration.
  if (import.meta.client) {
    user.value = await getProfile();
    authHydrated.value = true;
    return;
  }

  if (import.meta.server) {
    const event = useRequestEvent();
    const accessToken = event ? getCookie(event, ACCESS_TOKEN_COOKIE) : undefined;
    if (!accessToken) {
      user.value = null;
      return;
    }
  }

  const profile = await getProfile();
  user.value = profile;
});
