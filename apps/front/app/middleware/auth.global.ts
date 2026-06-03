import { useUser } from "~/composables/state";
import { getProfile } from "~/composables/user";

/**
 * Global authentication middleware
 * Runs on every route to check if user has a valid session cookie
 * Sets user state based on cookie validity
 */
export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const user = useUser();

  // Server-side: Always try to get profile from cookie
  if (import.meta.server) {
    const profile = await getProfile();
    user.value = profile;
    return;
  }

  // Client-side: Load profile if not already loaded
  if (import.meta.client && user.value === null) {
    const profile = await getProfile();
    user.value = profile;
  }
});
