import { Resvg } from "@resvg/resvg-js";
import {
  buildMatchOgSvg,
  fetchMatchDetailForOg,
  getMatchOgResvgFontOptions,
} from "../../../utils/match-og";

/**
 * GET /og/match/:id.svg → 301 to .png (legacy crawler URLs).
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
    font: getMatchOgResvgFontOptions(),
  });
  const pngBuffer = resvg.render().asPng();

  setHeader(event, "Content-Type", "image/png");
  setHeader(event, "Cache-Control", "public, max-age=300");

  return pngBuffer;
});
