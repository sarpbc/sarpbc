import { playerPath, teamPath } from "@sarpbc/utils";

export function useEntityTagLink() {
  const localePath = useLocalePath();
  const publicSiteUrl = useRuntimeConfig().public.publicSiteUrl as string;

  function href(path: string): string {
    return publicSiteUrl ? `${publicSiteUrl}${path}` : localePath(path);
  }

  function playerHref(slug: string): string {
    return href(playerPath(slug));
  }

  function teamHref(slug: string): string {
    return href(teamPath(slug));
  }

  const linkAttrs = publicSiteUrl === "" ? {} : { target: "_blank", rel: "noopener noreferrer" };

  return { playerHref, teamHref, linkAttrs };
}
