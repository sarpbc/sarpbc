import type { LocationQueryValue } from "vue-router";

export function routeQueryString(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string {
  return Array.isArray(value) ? "" : (value ?? "").trim();
}
