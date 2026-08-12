import type { User } from "~/types/user";
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

export async function updateUserName(userName: string): Promise<User> {
  const res = await apiFetch<{ user: User }>("/user/profile", {
    method: "PATCH",
    body: { userName },
  });
  return res.user;
}

export async function logout(): Promise<void> {
  const user = useUser();

  try {
    const res = await apiFetch<{ success?: boolean }>("/auth/logout", {
      method: "GET",
    });
    if (res.success === true) {
      user.value = null;
      navigateTo("/login");
      return;
    }
  } catch (error) {
    console.error("Logout failed:", error);
    throw new Error("Logout failed");
  }
}
