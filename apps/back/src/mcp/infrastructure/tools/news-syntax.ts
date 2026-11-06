import {
  NEWS_MATCH_BLOCK_DEFAULT_LIMIT,
  NEWS_MATCH_BLOCK_MAX_MATCHES,
  serializeNewsEntityTag,
  serializeNewsMatchTag,
  serializeNewsTweetTag,
} from "@sarpbc/utils";

export const PLAYER_TAG = serializeNewsEntityTag({
  kind: "player",
  slug: "<slug>",
  label: "<name>",
});
export const TEAM_TAG = serializeNewsEntityTag({ kind: "team", slug: "<slug>", label: "<name>" });
export const TWEET_TAG = serializeNewsTweetTag("https://x.com/<handle>/status/<id>");

const ONE_MATCH_TAG = serializeNewsMatchTag({ kind: "match", id: "<match id>" });
const SELECTION_TAG = serializeNewsMatchTag({
  kind: "matches",
  ids: ["<match id>", "<match id>"],
});
const TOURNAMENT_TAG = serializeNewsMatchTag({
  kind: "tournament",
  id: "<tournament id>",
  limit: NEWS_MATCH_BLOCK_DEFAULT_LIMIT,
});
const TEAM_MATCHES_TAG = serializeNewsMatchTag({
  kind: "team",
  id: "<team id>",
  limit: NEWS_MATCH_BLOCK_DEFAULT_LIMIT,
});

export const MATCH_BLOCK_FORMAT = `Embed live match scores with a match block on its own line, using match, tournament or team UUIDs from get_tournament, get_upcoming_matches, get_match_results or search_teams: \`${ONE_MATCH_TAG}\` for one match, \`${SELECTION_TAG}\` for a manual selection (up to ${NEWS_MATCH_BLOCK_MAX_MATCHES}, in that order), \`${TOURNAMENT_TAG}\` or \`${TEAM_MATCHES_TAG}\` for live, then upcoming, then latest matches (limit 1-${NEWS_MATCH_BLOCK_MAX_MATCHES}, default ${NEWS_MATCH_BLOCK_DEFAULT_LIMIT}). Quote every attribute value with double quotes. Use the same block in English and French bodies.`;

export const BODY_TAGS = `Mention players with \`${PLAYER_TAG}\` and teams with \`${TEAM_TAG}\`. Embed X posts with \`${TWEET_TAG}\` on its own line. ${MATCH_BLOCK_FORMAT}`;
