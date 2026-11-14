import { icons } from "@iconify-json/flag";
import { isNonEmptyString } from "@sarpbc/utils";

/**
 * GET /flags/:code.svg — nationality flags as long-cached images, so pages stop
 * inlining multi-KB flag SVGs into their HTML.
 */
export default defineEventHandler((event) => {
  const code = getRouterParam(event, "file")
    ?.match(/^(?<code>[a-z-]+)\.svg$/iu)
    ?.groups?.code?.toLowerCase();

  const name = `${code}-4x3`;
  const icon = icons.icons[name] ?? icons.icons[icons.aliases?.[name]?.parent ?? ""];

  if (!isNonEmptyString(code) || !icon) {
    throw createError({ statusCode: 404, statusMessage: "Flag not found" });
  }

  setHeader(event, "Content-Type", "image/svg+xml");
  setHeader(event, "Cache-Control", "public, max-age=31536000, immutable");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.width ?? icons.width} ${icon.height ?? icons.height}">${icon.body}</svg>`;
});
