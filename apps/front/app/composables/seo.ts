import { localizedPath, uiLocale } from "@sarpbc/utils";
import { markdownPathFromHtmlPath } from "~/utils/markdown-path";
import { resolveSiteUrl } from "~/utils/site-url";
import { SITE_ORIGIN } from "@sarpbc/ui/config";

const DEFAULT_TITLE = "Rocket League news & data | sarpbc.org";

const DEFAULT_DESCRIPTION =
  "Follow Rocket League esports on sarpbc.org: live RLCS schedules, match results, team and player pages, pick'ems, Air Riddle, and a bilingual community forum.";

const DEFAULT_SITE_NAME = "sarpbc.org";
const DEFAULT_IMAGE_PATH = "/og-image.jpg";
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

type OgImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/avif";

interface PageSeoMeta {
  title: string;
  ogTitle: string;
  ogSiteName: string;
  description: string;
  ogDescription: string;
  ogUrl: string;
  ogImage: string;
  ogImageWidth: number;
  ogImageHeight: number;
  ogImageType?: OgImageMime;
  ogType: "website";
  twitterCard: "summary" | "summary_large_image";
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  robots: "noindex, nofollow" | "index, follow";
}

const resolveImageUrl = (image?: string | null): string =>
  resolveSiteUrl(image) ?? `${SITE_ORIGIN}${DEFAULT_IMAGE_PATH}`;

const resolveImageType = (imageUrl: string): OgImageMime | undefined => {
  const path = imageUrl.split("?")[0]?.toLowerCase() ?? "";

  if (path.endsWith(".png")) {
    return "image/png";
  }

  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (path.endsWith(".webp")) {
    return "image/webp";
  }

  if (path.endsWith(".gif")) {
    return "image/gif";
  }

  if (path.endsWith(".avif")) {
    return "image/avif";
  }

  return undefined;
};

export const useSarpbcSeo = () => {
  const { locales } = useI18n();
  const route = useRoute();

  const getCanonicalUrl = () => `${SITE_ORIGIN}${route.path === "/fr" ? "/fr/" : route.path}`;

  const setPageSeo = (opts?: {
    title?: string;
    description?: string;
    image?: string | null;
    noIndex?: boolean;
    twitterCard?: "summary" | "summary_large_image";
  }) => {
    const title = opts?.title ?? DEFAULT_TITLE;
    const description = opts?.description ?? DEFAULT_DESCRIPTION;
    const image = resolveImageUrl(opts?.image);
    const imageType = resolveImageType(image);
    const noIndex = opts?.noIndex ?? false;
    const twitterCard = opts?.twitterCard ?? "summary_large_image";

    useHead(() => {
      const cleanPath = route.path.replace(/^\/fr(?=\/|$)/u, "") || "/";

      const alternateLinks = locales.value.map((loc) => ({
        href: `${SITE_ORIGIN}${localizedPath(cleanPath, uiLocale(loc.code))}`,
        hreflang: loc.language,
        rel: "alternate" as const,
      }));

      alternateLinks.push({
        href: `${SITE_ORIGIN}${cleanPath}`,
        hreflang: "x-default",
        rel: "alternate" as const,
      });

      const pageLinks: (
        | { rel: "canonical"; href: string }
        | { rel: "alternate"; href: string; hreflang?: string; type?: string }
      )[] = [{ href: getCanonicalUrl(), rel: "canonical" }, ...alternateLinks];

      if (!noIndex) {
        pageLinks.push({
          href: `${SITE_ORIGIN}${markdownPathFromHtmlPath(route.path)}`,
          rel: "alternate",
          type: "text/markdown",
        });
      }

      return { link: pageLinks };
    });

    const seoMeta: PageSeoMeta = {
      description,
      ogDescription: description,
      ogImage: image,
      ogImageHeight: OG_IMAGE_HEIGHT,
      ogImageWidth: OG_IMAGE_WIDTH,
      ogSiteName: DEFAULT_SITE_NAME,
      ogTitle: title,
      ogType: "website",
      ogUrl: getCanonicalUrl(),
      robots: noIndex ? "noindex, nofollow" : "index, follow",
      title,
      twitterCard,
      twitterDescription: description,
      twitterImage: image,
      twitterTitle: title,
    };

    if (imageType) {
      seoMeta.ogImageType = imageType;
    }

    useSeoMeta({ ...seoMeta, ogUrl: getCanonicalUrl });
  };

  return {
    getCanonicalUrl,
    setPageSeo,
  };
};
