import {
  buildMatchIcs,
  fetchMatchForCalendar,
  icsFilename,
  parseIcsSlug,
  sendIcs,
} from "../../../utils/calendar";

export default defineEventHandler(async (event) => {
  const id = parseIcsSlug(getRequestURL(event).pathname);
  if (!id) {
    throw createError({ statusCode: 404, statusMessage: "Match not found" });
  }

  const match = await fetchMatchForCalendar(id);
  const ics = buildMatchIcs(match, new Date());
  return sendIcs(event, ics, icsFilename("match", id));
});
