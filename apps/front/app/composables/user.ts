import type { User } from "@sarpbc/types";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const useAuthHydrated = () => useState<boolean>("auth-hydrated", () => false);

type ApiClient = ReturnType<typeof createApiClient>;

/** Throws on request failure. Pass a client created in setup when called outside the Nuxt context. */
export const fetchProfile = async (api: ApiClient = createApiClient()) => {
  const res = await api<{ user?: User }>("/user/profile", { method: "GET" });

  return res.user ?? null;
};

export const getProfile = async () => {
  try {
    return await fetchProfile();
  } catch {
    return null;
  }
};

export const updateUserName = async (userName: string) => {
  const res = await apiFetch<{ user: User }>("/user/profile", {
    body: { userName },
    method: "PATCH",
  });

  return res.user;
};

export const logout = async () => {
  const user = useUser();

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
    throw new Error("Logout failed");
  }

  user.value = null;
  void navigateTo("/login");
};
