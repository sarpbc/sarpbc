import type { MatchVod, MatchVodSource } from "@sarpbc/types";
import {
  MAX_VODS_PER_GAME,
  isIso6391Code,
  maxVodGame,
  parseMatchVodUrl,
  type MatchVodUrlError,
} from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors";

export interface MatchVodLink {
  url: string;
  language: string;
  source?: MatchVodSource;
}

export interface MatchVodInput extends MatchVodLink {
  game: number;
}

const URL_ERRORS = {
  "invalid-url": "is not a valid URL",
  "not-https": "must use https",
  "unsupported-host": "must be a twitch.tv, youtube.com or youtu.be link",
  "invalid-timestamp": "has an invalid t= timestamp (use seconds or 1h2m3s)",
} satisfies Record<MatchVodUrlError, string>;

function invalid(index: number, reason: string): InvalidInputError {
  return new InvalidInputError(`VOD link ${index + 1} ${reason}.`);
}

/**
 * Validates VOD links against the match format, derives each source from its host and drops
 * repeated URLs within a game, keeping the first. Games are sorted; links keep their order.
 */
export function normalizeMatchVods(
  inputs: readonly MatchVodInput[],
  numberOfGames: number | null,
): MatchVod[] {
  const maxGame = maxVodGame(numberOfGames);
  const vods: MatchVod[] = [];
  const seen = new Set<string>();
  inputs.forEach((input, index) => {
    if (!Number.isInteger(input.game) || input.game < 1 || input.game > maxGame)
      throw invalid(index, `must target a game between 1 and ${maxGame}`);
    const parsed = parseMatchVodUrl(input.url);
    if (!parsed.ok) throw invalid(index, URL_ERRORS[parsed.error]);
    if (input.source !== undefined && input.source !== parsed.source)
      throw invalid(index, `is a ${parsed.source} link, not ${input.source}`);
    const language = input.language.trim().toLowerCase();
    if (!isIso6391Code(language))
      throw invalid(index, "needs a two-letter ISO 639-1 language code (e.g. en, fr)");
    const key = `${input.game} ${parsed.url}`;
    if (seen.has(key)) return;
    seen.add(key);
    vods.push({ game: input.game, url: parsed.url, language, source: parsed.source });
  });
  for (let game = 1; game <= maxGame; game++)
    if (vods.filter((vod) => vod.game === game).length > MAX_VODS_PER_GAME)
      throw new InvalidInputError(`Game ${game} has more than ${MAX_VODS_PER_GAME} VOD links.`);
  return vods.sort((a, b) => a.game - b.game);
}

export function replaceGameVods(
  current: readonly MatchVod[],
  game: number,
  links: readonly MatchVodLink[],
  numberOfGames: number | null,
): MatchVod[] {
  const replaced = normalizeMatchVods(
    links.map((link) => ({ ...link, game })),
    numberOfGames,
  );
  return [...current.filter((vod) => vod.game !== game), ...replaced].sort(
    (a, b) => a.game - b.game,
  );
}
