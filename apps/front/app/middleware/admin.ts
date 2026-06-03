import { useUser } from "~/composables/state";

/**
 * Admin-only middleware
 * Protects dashboard routes - only accessible by admin users
 * Usage: Add definePageMeta({ middleware: ['admin'] }) to dashboard pages
 */
export default defineNuxtRouteMiddleware((_to, _from) => {
  const user = useUser();

  // Redirect to login if not authenticated
  if (user.value === null) {
    return navigateTo("/login");
  }

  // Redirect to home if authenticated but not admin
  if (user.value.admin !== true) {
    return navigateTo("/");
  }
});
