import { playerPath, teamPath } from "@sarpbc/utils";

export function useEntityTagLink() {
  const localePath = useLocalePath();
  const config = useRuntimeConfig();

  function href(path: string): string {
    const site = config.public.publicSiteUrl as string | undefined;
    return site ? `${site.replace(/\/$/, "")}${path}` : localePath(path);
  }

  function playerHref(slug: string): string {
    return href(playerPath(slug));
  }

  function teamHref(slug: string): string {
    return href(teamPath(slug));
  }

  const opensInNewTab = computed(() => Boolean(config.public.publicSiteUrl));

  return { playerHref, teamHref, opensInNewTab };
}
