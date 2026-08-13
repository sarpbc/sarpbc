import {
  buildTournamentIcs,
  fetchTournamentForCalendar,
  icsFilename,
  parseIcsSlug,
  sendIcs,
} from "../../../utils/calendar";

export default defineEventHandler(async (event) => {
  const id = parseIcsSlug(getRequestURL(event).pathname);
  if (!id) {
    throw createError({ statusCode: 404, statusMessage: "Tournament not found" });
  }

  const { tournament, matches } = await fetchTournamentForCalendar(id);
  const ics = buildTournamentIcs(tournament, matches, new Date());
  return sendIcs(event, ics, icsFilename("tournament", id));
});
