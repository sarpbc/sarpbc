import { handleContentSitemapChunk } from "../../../../utils/sitemap";

export default defineEventHandler((event) => {
  return handleContentSitemapChunk(
    event,
    getRouterParam(event, "kind"),
    getRouterParam(event, "n"),
  );
});
