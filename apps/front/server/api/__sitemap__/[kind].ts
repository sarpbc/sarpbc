import { defineSitemapEventHandler } from "#sitemap/server";
import { apiFetch } from "@sarpbc/composables/api-fetch";
import type { SitemapEntry } from "@sarpbc/types";
import { isNonEmptyString } from "@sarpbc/utils";

export default defineSitemapEventHandler(async (event) => {
  const kind = getRouterParam(event, "kind");
  const entries = await apiFetch<SitemapEntry[]>(`/sitemap/${kind}`);

  return entries.map(({ path, lastmod }) => ({
    _i18nTransform: true,
    // WARNING: without its name, an i18n entry is assigned to the locale sitemap and dropped from this one.
    _sitemap: kind,
    lastmod: isNonEmptyString(lastmod) ? lastmod : undefined,
    loc: path,
  }));
});
