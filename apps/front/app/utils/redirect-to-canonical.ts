import type { RouteLocationNormalizedLoaded } from "vue-router";

export async function redirectToCanonical(route: RouteLocationNormalizedLoaded, path: string) {
  return await navigateTo(
    { path, query: route.query, hash: route.hash },
    { redirectCode: 301, replace: true },
  );
}
