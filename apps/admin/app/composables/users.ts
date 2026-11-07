import type { UserList, UserListItem } from "@sarpbc/types";
import type { AssignableRole } from "~/types/user";

export async function getUsers(query: {
  search?: string;
  limit: number;
  offset: number;
}): Promise<UserList> {
  return apiFetch<UserList>("/users", {
    method: "GET",
    query: { ...query, search: query.search || undefined },
  });
}

export async function changeUserRole(id: string, role: AssignableRole): Promise<UserListItem> {
  const res = await apiFetch<{ user: UserListItem }>(`/users/${id}/role`, {
    method: "PATCH",
    body: { role },
  });
  return res.user;
}
