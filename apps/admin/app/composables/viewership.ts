import type { Viewership, ViewershipResponse } from "@sarpbc/types";

export async function getViewership(path: string): Promise<ViewershipResponse> {
  return apiFetch<ViewershipResponse>(path, { method: "GET" });
}

export async function setViewership(
  path: string,
  viewership: Viewership | null,
): Promise<ViewershipResponse> {
  return apiFetch<ViewershipResponse>(path, { method: "PUT", body: { viewership } });
}
