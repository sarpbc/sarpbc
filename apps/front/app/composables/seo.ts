/**
 * SEO composable for setting page-specific meta tags, canonical URLs, and alternate links
 *
 * @example
 * // In a page component:
 * const { setPageSeo } = useSarpbcSeo();
 * setPageSeo({
 *   title: "Player Name | sarpbc.org",
 *   description: "View player statistics and match history",
 *   image: "https://sarpbc.org/custom-image.png"
 * });
 */

import { markdownPathFromHtmlPath } from "~/utils/markdownPath";

const DEFAULT_TITLE = "Rocket League news & data | sarpbc.org";
const DEFAULT_DESCRIPTION =
  "Follow Rocket League esports on sarpbc.org: live RLCS schedules, match results, team and player pages, pick'ems, Air Riddle, and a bilingual community forum.";
const DEFAULT_SITE_NAME = "sarpbc.org";
const DEFAULT_IMAGE_PATH = "/og-image.jpg";
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

type OgImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/avif";

export const useSarpbcSeo = () => {
  const { locales } = useI18n();
  const route = useRoute();
  const baseUrl = "https://sarpbc.org";

  const resolveImageUrl = (image?: string | null): string => {
    const trimmed = image?.trim();
    if (!trimmed) {
      return `${baseUrl}${DEFAULT_IMAGE_PATH}`;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    if (trimmed.startsWith("//")) {
      return `https:${trimmed}`;
    }

    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${baseUrl}${path}`;
  };

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

  /**
   * Set page-specific SEO meta tags, canonical URL, and alternate links
   */
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

    // Get canonical URL for og:url (remove /fr prefix)
    const cleanPath = route.path.replace(/^\/fr/, "");
    const canonicalUrl = `${baseUrl}${cleanPath}`;

    // Build alternate language links
    const availableLocales = locales.value as Array<{
      code: string;
      language: string;
    }>;

    const alternateLinks = availableLocales.map((loc) => ({
      rel: "alternate" as const,
      hreflang: loc.language,
      href: loc.code === "en" ? `${baseUrl}${cleanPath}` : `${baseUrl}/${loc.code}${cleanPath}`,
    }));

    // Add x-default for English
    alternateLinks.push({
      rel: "alternate" as const,
      hreflang: "x-default",
      href: canonicalUrl,
    });

    const pageLinks: Array<Record<string, string>> = [
      { rel: "canonical", href: canonicalUrl },
      ...alternateLinks,
    ];

    if (!noIndex) {
      pageLinks.push({
        rel: "alternate",
        type: "text/markdown",
        href: `${baseUrl}${markdownPathFromHtmlPath(route.path)}`,
      });
    }

    useHead({
      link: pageLinks,
    });

    // Set SEO meta tags
    useSeoMeta({
      title,
      ogTitle: title,
      ogSiteName: DEFAULT_SITE_NAME,
      description,
      ogDescription: description,
      ogUrl: canonicalUrl,
      ogImage: image,
      ogImageWidth: OG_IMAGE_WIDTH,
      ogImageHeight: OG_IMAGE_HEIGHT,
      ...(imageType ? { ogImageType: imageType } : {}),
      ogType: "website",
      twitterCard,
      twitterTitle: title,
      twitterDescription: description,
      twitterImage: image,
      robots: noIndex ? "noindex, nofollow" : "index, follow",
    });
  };

  /**
   * Get current canonical URL
   */
  const getCanonicalUrl = () => {
    const cleanPath = route.path.replace(/^\/fr/, "");
    return `${baseUrl}${cleanPath}`;
  };

  return {
    setPageSeo,
    getCanonicalUrl,
  };
};
