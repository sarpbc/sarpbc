import { useUser } from "~/composables/state";
import { hasPermission, isStaffUser, permissionForAdminPath } from "~/utils/staff";

export default defineNuxtRouteMiddleware((to) => {
  const path = to.path.replace(/\/$/, "") || "/";
  if (path === "/login" || path === "/fr/login") {
    return;
  }

  const user = useUser();

  if (!user.value) {
    return navigateTo("/login");
  }

  if (!isStaffUser(user.value)) {
    return navigateTo("/login");
  }

  const required = permissionForAdminPath(to.path);
  if (required === null || required === "staff") {
    return;
  }

  if (!hasPermission(user.value, required)) {
    const localePath = useLocalePath();
    return navigateTo({
      path: localePath("/"),
      query: { forbidden: "1" },
    });
  }
});
