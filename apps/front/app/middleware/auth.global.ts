import { useUser } from "~/composables/state";
import { getProfile } from "~/composables/user";

const ACCESS_TOKEN_COOKIE = "access_token";

/**
 * Global authentication middleware
 * Resolves session once per app load.
 * `undefined` = unknown, `null` = guest, `User` = authenticated.
 *
 * SSR skips the profile request when the httpOnly access_token cookie is absent.
 * Client cannot read httpOnly cookies, so it fetches once when state is still unknown
 * (credentials are sent automatically via apiFetch).
 */
export default defineNuxtRouteMiddleware(async () => {
  const user = useUser();

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
