import type { User } from "@sarpbc/types";

export const getProfile = async () => {
  try {
    const res = await apiFetch<{ user?: User }>("/user/profile", {
      method: "GET",
    });

    return res.user ?? null;
  } catch {
    return null;
  }
};

export const useLogout = () => {
  const user = useUser();
  const localePath = useLocalePath();
  const toast = useToast();
  const { $i18n } = useNuxtApp();
  const loggingOut = ref(false);

  const logout = async () => {
    if (loggingOut.value) {
      return;
    }

    loggingOut.value = true;

    try {
      let confirmed = false;

      try {
        const res = await apiFetch<{ success?: boolean }>("/auth/logout", {
          method: "GET",
        });

        confirmed = res.success === true;
      } catch (error) {
        console.error("Logout failed:", error);
      }

      if (!confirmed) {
        toast.add({ color: "danger", title: $i18n.t("page.home.logoutFailed") });

        return;
      }

      user.value = null;
      await navigateTo(localePath("/login"));
    } finally {
      loggingOut.value = false;
    }
  };

  return { loggingOut, logout };
};
