import { isStaffUser } from "@sarpbc/utils";
import { canAccessRoute } from "~/utils/adminSections";

export default defineNuxtRouteMiddleware(async (to) => {
  const baseName = useRouteBaseName()(to);

  if (baseName === "login") {
    return;
  }

  const user = useUser();
  const localePath = useLocalePath();

  if (!isStaffUser(user.value)) {
    return await navigateTo(localePath("/login"));
  }

  if (!canAccessRoute(user.value, baseName?.toString())) {
    return await navigateTo({
      path: localePath("/"),
      query: { forbidden: "1" },
    });
  }
});
