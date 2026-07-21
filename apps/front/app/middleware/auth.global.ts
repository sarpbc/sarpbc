import { useUser } from "~/composables/state";
import { getProfile } from "~/composables/user";

const ACCESS_TOKEN_COOKIE = "access_token";

/**
 * Global authentication middleware
 * Resolves session once per app load.
 * `undefined` = unknown, `null` = guest, `User` = authenticated.
 *
 * SSR skips the profile request when the httpOnly access_token cookie is absent.
 * Client always revalidates once when SSR hydrated as guest/unknown — Nitro SWR
 * routeRules ignore request cookies, so cached SSR can stamp `user = null` even
 * when a valid access_token cookie exists (see SAR-73).
 */
export default defineNuxtRouteMiddleware(async () => {
  const user = useUser();
  const authHydrated = useState<boolean>("auth-hydrated", () => false);

  if (import.meta.client && !authHydrated.value) {
    if (user.value === null || user.value === undefined) {
      user.value = await getProfile();
    }
    authHydrated.value = true;
    return;
  }

  if (user.value !== undefined) {
    return;
  }

  if (import.meta.server) {
    const accessToken = useCookie(ACCESS_TOKEN_COOKIE);
    if (!accessToken.value) {
      user.value = null;
      return;
    }
  }

  const profile = await getProfile();
  user.value = profile;
});
