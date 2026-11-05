import { useUser } from "~/composables/state";
import { isStaffUser, meetsRequirement, permissionForAdminPath } from "~/utils/staff";

export default defineNuxtRouteMiddleware((to) => {
  const path = to.path.replace(/\/$/, "") || "/";
  if (path === "/login" || path === "/fr/login") {
    return;
  }

  const user = useUser();

  if (!isStaffUser(user.value)) {
    return navigateTo("/login");
  }

  const required = permissionForAdminPath(to.path);
  if (required === "staff") {
    return;
  }

  if (!meetsRequirement(user.value, required)) {
    const localePath = useLocalePath();
    return navigateTo({
      path: localePath("/"),
      query: { forbidden: "1" },
    });
  }
});
