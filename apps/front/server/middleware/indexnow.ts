import { INDEXNOW_KEY_PATTERN } from "@sarpbc/utils";

export default defineEventHandler((event) => {
  const { indexnowKey } = useRuntimeConfig(event);
  if (
    !INDEXNOW_KEY_PATTERN.test(indexnowKey) ||
    getRequestURL(event).pathname !== `/${indexnowKey}.txt`
  ) {
    return;
  }
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "no-store");
  setHeader(event, "X-Robots-Tag", "noindex");
  return indexnowKey;
});
