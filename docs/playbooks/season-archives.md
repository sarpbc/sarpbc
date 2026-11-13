# RLCS season archive playbook

How sarpbc.org staff publish an RLCS season archive: one public page per season with the format of that era, the winner, the participating teams and their path through the season. Staff enter every field by hand in the admin app. The archive is a pilot: start with one season and grow it from there.

## Rules

- Write the format, path notes and results in your own words from official announcements and the tournament pages already on sarpbc.org.
- Never use Liquipedia or BLAST.tv as a source, and never copy text, tables or brackets from them or from any other third-party wiki. No Epic Games assets.
- Do not import or paste a historical dataset. Enter each season by hand.
- Pick winners and participants from existing teams. Create a missing team through the usual team workflow first; the archive never creates teams.
- A path result can link an existing tournament stage. A result linked to a start.gg stage stays visible in the admin, flagged, but is left out of the public page and of the API.

## Create the pilot season

You need a staff role with `tournaments.manage`.

1. In the admin, open **Seasons** and select **New Season**, or open the season that already holds the awards. A season is one record: its awards and its archive live together.
2. Fill in **Name** as the organiser names it, for example `RLCS 2024`.
3. Leave **Public slug** empty while you prepare the season. The season stays off the public site until it has a slug.
4. Write the **Format** in a few sentences and, if it helps, list the **Phases** in order, each with a short description.
5. Under **Participants**, search for each team and add it. For each team:
   - write an optional **Path note** summarising its season;
   - add results in order: an **Event** label, a **Result** (`1st`, `Top 8`, `Qualified`…) and, when the event exists on sarpbc.org, **Link Tournament** to its stage.
6. Back in **Season details**, choose the **Winner** among the participants and save.
7. When the season reads well, set the **Public slug** (for example `rlcs-2024`) and save. The page is then live at `/seasons/<slug>` and listed on `/seasons`.

An empty season with a slug still renders: the page shows its structure with empty winner, format and participant sections. Clear the slug to take a season off the public site; its data stays in the admin.

## Constraints the API enforces

- A slug is unique across seasons and cannot look like a UUID.
- The winner must be one of the participants, and the winning team cannot be removed until the winner is cleared.
- A team takes part once per season. Merging two teams folds their participations and paths into the kept team.
- Deleting a team removes its participations; deleting a tournament stage keeps the path result and drops its link.
