import { playerPath, teamPath } from "@sarpbc/utils";
import { useRuntimeConfig } from "nuxt/app";
import { useLocalePath } from "#i18n";

declare module "nuxt/schema" {
  interface PublicRuntimeConfig {
    publicSiteUrl: string;
  }
}

export const useEntityTagLink = () => {
  const localePath = useLocalePath();
  const { publicSiteUrl } = useRuntimeConfig().public;

  const href = (path: string) =>
    publicSiteUrl === "" ? localePath(path) : `${publicSiteUrl}${path}`;

  const playerHref = (slug: string) => href(playerPath(slug));

  const teamHref = (slug: string) => href(teamPath(slug));

  const linkAttrs = publicSiteUrl === "" ? {} : { rel: "noopener noreferrer", target: "_blank" };

  return { linkAttrs, playerHref, teamHref };
};
