import type { AdminUser, AdminUserList, AssignableRole } from "~/types/user";
import { apiFetch } from "~/utils/apiFetch";

export async function getUsers(query: {
  search?: string;
  limit: number;
  offset: number;
}): Promise<AdminUserList> {
  return apiFetch<AdminUserList>("/users", {
    method: "GET",
    query: { ...query, search: query.search || undefined },
  });
}

export async function changeUserRole(id: string, role: AssignableRole): Promise<AdminUser> {
  const res = await apiFetch<{ user: AdminUser }>(`/users/${id}/role`, {
    method: "PATCH",
    body: { role },
  });
  return res.user;
}
