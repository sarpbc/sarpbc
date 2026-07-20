import { useUser } from "~/composables/state";
import { getProfile } from "~/composables/user";

/**
 * Global authentication middleware
 * Resolves session once per app load on the client.
 * `undefined` = unknown, `null` = guest, `User` = authenticated.
 *
 * SSR intentionally leaves state as `undefined`: the access_token cookie may live
 * on the API origin (local), and SWR pages share payloads across users. The client
 * fetches once when state is still unknown (credentials via apiFetch).
 */
export default defineNuxtRouteMiddleware(async () => {
  const user = useUser();

  if (user.value !== undefined) {
    return;
  }

  if (import.meta.server) {
    return;
  }

  const profile = await getProfile();
  user.value = profile;
});
