import { useUser } from "~/composables/state";

/**
 * Admin-only middleware for the staff console.
 * Guests and non-admins are sent to /login (not the public site).
 * Login routes are excluded so the form is reachable.
 */
export default defineNuxtRouteMiddleware((to) => {
  const path = to.path.replace(/\/$/, "") || "/";
  if (path === "/login" || path === "/fr/login") {
    return;
  }

  const user = useUser();

  if (!user.value) {
    return navigateTo("/login");
  }

  if (user.value.admin !== true) {
    return navigateTo("/login");
  }
});
