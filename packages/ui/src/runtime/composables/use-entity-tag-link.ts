import { playerPath, teamPath } from "@sarpbc/utils";
import { useRuntimeConfig } from "nuxt/app";
import { useLocalePath } from "#i18n";

declare module "nuxt/schema" {
  interface PublicRuntimeConfig {
    publicSiteUrl: string;
  }
}

export function useEntityTagLink() {
  const localePath = useLocalePath();
  const { publicSiteUrl } = useRuntimeConfig().public;

  function href(path: string): string {
    return publicSiteUrl === "" ? localePath(path) : `${publicSiteUrl}${path}`;
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
