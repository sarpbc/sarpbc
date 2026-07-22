import { Resvg } from "@resvg/resvg-js";
import { buildMatchOgSvg, fetchMatchDetailForOg } from "../../../utils/match-og";

/**
 * Serves match Open Graph images.
 * - GET /og/match/:id.png → PNG card
 * - GET /og/match/:id.svg → 301 → .png (legacy crawler URLs)
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  const segment = path.split("/").pop() ?? "";
  const pngMatch = segment.match(/^(.+)\.png$/i);
  const svgMatch = segment.match(/^(.+)\.svg$/i);

  if (svgMatch?.[1]) {
    return sendRedirect(event, `/og/match/${svgMatch[1]}.png`, 301);
  }

  const id = pngMatch?.[1];
  if (!id) {
    throw createError({ statusCode: 404, statusMessage: "Match not found" });
  }

  const matchDetail = await fetchMatchDetailForOg(id);
  const svg = buildMatchOgSvg(matchDetail);

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1200,
    },
  });
  const pngBuffer = resvg.render().asPng();

  setHeader(event, "Content-Type", "image/png");
  setHeader(event, "Cache-Control", "public, max-age=300");

  return pngBuffer;
});
