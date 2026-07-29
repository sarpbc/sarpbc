export function useEntityTagLink() {
  const localePath = useLocalePath();
  const config = useRuntimeConfig();

  function playerHref(slug: string): string {
    const site = config.public.publicSiteUrl as string | undefined;
    if (site) {
      return `${site.replace(/\/$/, "")}/player/${slug}`;
    }
    return localePath(`/player/${slug}`);
  }

  function teamHref(slug: string): string {
    const site = config.public.publicSiteUrl as string | undefined;
    if (site) {
      return `${site.replace(/\/$/, "")}/team/${slug}`;
    }
    return localePath(`/team/${slug}`);
  }

  const opensInNewTab = computed(() => Boolean(config.public.publicSiteUrl));

  return { playerHref, teamHref, opensInNewTab };
}
