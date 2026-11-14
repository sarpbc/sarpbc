import type { RouteLocationNormalizedLoaded } from "vue-router";

export const redirectToCanonical = async (route: RouteLocationNormalizedLoaded, path: string) =>
  await navigateTo(
    { path, query: route.query, hash: route.hash },
    { redirectCode: 301, replace: true },
  );
