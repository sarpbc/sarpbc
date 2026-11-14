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

  const href = (path: string): string =>
    publicSiteUrl === "" ? localePath(path) : `${publicSiteUrl}${path}`;

  const playerHref = (slug: string): string => href(playerPath(slug));

  const teamHref = (slug: string): string => href(teamPath(slug));

  const linkAttrs = publicSiteUrl === "" ? {} : { target: "_blank", rel: "noopener noreferrer" };

  return { playerHref, teamHref, linkAttrs };
};
