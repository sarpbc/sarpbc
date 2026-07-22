import { useUser } from "~/composables/state";
import { getProfile } from "~/composables/user";

/**
 * Resolves session once per app load for the SPA admin console.
 * `undefined` = unknown, `null` = guest, `User` = authenticated.
 */
export default defineNuxtRouteMiddleware(async () => {
  const user = useUser();

  if (user.value !== undefined) {
    return;
  }

  user.value = await getProfile();
});
