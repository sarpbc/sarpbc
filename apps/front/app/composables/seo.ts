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

export const useSarpbcSeo = () => {
  const { locales } = useI18n();
  const route = useRoute();
  const baseUrl = "https://sarpbc.org";

  /**
   * Set page-specific SEO meta tags, canonical URL, and alternate links
   */
  const setPageSeo = (opts?: {
    title?: string;
    description?: string;
    image?: string;
    noIndex?: boolean;
    twitterCard?: "summary" | "summary_large_image";
  }) => {
    const {
      title = "Rocket League news & data | sarpbc.org",
      description = "Rocket League news & data | sarpbc.org",
      image = "https://sarpbc.org/sarpbc.png",
      noIndex = false,
      twitterCard = "summary_large_image",
    } = opts || {};

    // Get canonical URL for og:url (remove /fr prefix)
    const cleanPath = route.path.replace(/^\/fr/, "");
    const canonicalUrl = `${baseUrl}${cleanPath}`;

    // Build alternate language links
    const alternateLinks = [];
    const availableLocales = locales.value as Array<{
      code: string;
      language: string;
    }>;

    availableLocales.forEach((loc) => {
      const href =
        loc.code === "en" ? `${baseUrl}${cleanPath}` : `${baseUrl}/${loc.code}${cleanPath}`;

      alternateLinks.push({
        rel: "alternate",
        hreflang: loc.language,
        href,
      });
    });

    // Add x-default for English
    alternateLinks.push({
      rel: "alternate",
      hreflang: "x-default",
      href: canonicalUrl,
    });

    // Set canonical and alternate links
    useHead({
      link: [{ rel: "canonical", href: canonicalUrl }, ...alternateLinks],
    });

    // Set SEO meta tags
    useSeoMeta({
      title,
      ogTitle: title,
      description,
      ogDescription: description,
      ogUrl: canonicalUrl,
      ogImage: image,
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
