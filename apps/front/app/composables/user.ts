import type { User } from "@sarpbc/types";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export function useAuthHydrated() {
  return useState<boolean>("auth-hydrated", () => false);
}

type ApiClient = ReturnType<typeof createApiClient>;

/** Throws on request failure. Pass a client created in setup when called outside the Nuxt context. */
export async function fetchProfile(api: ApiClient = createApiClient()): Promise<User | null> {
  const res = await api<{ user?: User }>("/user/profile", { method: "GET" });
  return res.user ?? null;
}

export async function getProfile(): Promise<User | null> {
  try {
    return await fetchProfile();
  } catch {
    return null;
  }
}

export async function updateUserName(userName: string): Promise<User> {
  const res = await apiFetch<{ user: User }>("/user/profile", {
    method: "PATCH",
    body: { userName },
  });
  return res.user;
}

export async function logout(): Promise<void> {
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
  navigateTo("/login");
}
