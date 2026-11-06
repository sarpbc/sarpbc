import { playerPath, teamPath } from "@sarpbc/utils";
import type { ModuleOptions } from "../../module";

export function useEntityTagLink() {
  const localePath = useLocalePath();
  const { entityTagSiteUrl } = useRuntimeConfig().public.sarpbcUi as ModuleOptions;

  function href(path: string): string {
    return entityTagSiteUrl ? `${entityTagSiteUrl.replace(/\/$/, "")}${path}` : localePath(path);
  }

  function playerHref(slug: string): string {
    return href(playerPath(slug));
  }

  function teamHref(slug: string): string {
    return href(teamPath(slug));
  }

  return { playerHref, teamHref, opensInNewTab: entityTagSiteUrl !== "" };
}
