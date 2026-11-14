import type { Viewership, ViewershipResponse } from "@sarpbc/types";

export const getViewership = async (path: string): Promise<ViewershipResponse> =>
  await apiFetch<ViewershipResponse>(path, { method: "GET" });

export const setViewership = async (
  path: string,
  viewership: Viewership | null,
): Promise<ViewershipResponse> =>
  await apiFetch<ViewershipResponse>(path, { method: "PUT", body: { viewership } });
