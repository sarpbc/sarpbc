import type { RouteLocationNormalizedLoaded } from "vue-router";

export function redirectToCanonical(route: RouteLocationNormalizedLoaded, path: string) {
  return navigateTo(
    { path, query: route.query, hash: route.hash },
    { redirectCode: 301, replace: true },
  );
}
