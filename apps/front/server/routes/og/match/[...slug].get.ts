import { Resvg } from "@resvg/resvg-js";
import { isNonEmptyString } from "@sarpbc/utils";
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
  const pngMatch = /^(?<id>.+)\.png$/iu.exec(segment);
  const svgMatch = /^(?<id>.+)\.svg$/iu.exec(segment);

  if (isNonEmptyString(svgMatch?.groups?.id)) {
    await sendRedirect(event, `/og/match/${svgMatch.groups.id}.png`, 301);

    return;
  }

  const id = pngMatch?.groups?.id;

  if (!isNonEmptyString(id)) {
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

  await send(event, pngBuffer);
});
