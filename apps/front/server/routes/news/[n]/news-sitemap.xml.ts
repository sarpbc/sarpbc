import { handleNewsSitemapChunk } from "../../../utils/sitemap";

export default defineEventHandler((event) => {
  return handleNewsSitemapChunk(event, getRouterParam(event, "n"));
});
