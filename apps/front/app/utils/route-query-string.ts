import type { LocationQueryValue } from "vue-router";

export const routeQueryString = (
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string => (Array.isArray(value) ? "" : (value ?? "").trim());
