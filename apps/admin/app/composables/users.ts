import { isNonEmptyString } from "@sarpbc/utils";
import type { UserList, UserListItem } from "@sarpbc/types";
import type { AssignableRole } from "~/types/user";

export const getUsers = async (query: {
  search?: string;
  limit: number;
  offset: number;
}): Promise<UserList> =>
  await apiFetch<UserList>("/users", {
    method: "GET",
    query: { ...query, search: isNonEmptyString(query.search) ? query.search : undefined },
  });

export const changeUserRole = async (id: string, role: AssignableRole): Promise<UserListItem> => {
  const res = await apiFetch<{ user: UserListItem }>(`/users/${id}/role`, {
    method: "PATCH",
    body: { role },
  });

  return res.user;
};
