import type { User } from "@sarpbc/types";
import { apiFetch } from "~/utils/apiFetch";

export async function getProfile(): Promise<User | null> {
  try {
    const res = await apiFetch<{ user?: User }>("/user/profile", {
      method: "GET",
    });
    return res.user ?? null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  const user = useUser();
  const localePath = useLocalePath();
  const toast = useToast();
  const { $i18n } = useNuxtApp();

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
    toast.add({ title: $i18n.t("page.home.logoutFailed"), color: "error" });
    return;
  }
  user.value = null;
  await navigateTo(localePath("/login"));
}
