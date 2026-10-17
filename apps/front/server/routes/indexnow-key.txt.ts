import { INDEXNOW_KEY } from "@sarpbc/utils";

export default defineEventHandler((event) => {
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600");
  setHeader(event, "X-Robots-Tag", "noindex");
  return INDEXNOW_KEY;
});
