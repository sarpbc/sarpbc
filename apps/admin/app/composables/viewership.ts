import type { Viewership, ViewershipResponse } from "@sarpbc/types";

export const getViewership = async (path: string) =>
  await apiFetch<ViewershipResponse>(path, { method: "GET" });

export const setViewership = async (path: string, viewership: Viewership | null) =>
  await apiFetch<ViewershipResponse>(path, { body: { viewership }, method: "PUT" });
