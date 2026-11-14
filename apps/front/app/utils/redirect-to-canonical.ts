import type { RouteLocationNormalizedLoaded } from "vue-router";

export const redirectToCanonical = async (route: RouteLocationNormalizedLoaded, path: string) =>
  await navigateTo(
    { hash: route.hash, path, query: route.query },
    { redirectCode: 301, replace: true },
  );
