export const TWITCH_LOGIN_MAX_LENGTH = 25;

export const TWITCH_LOGIN_PATTERN = new RegExp(
  `^[a-z0-9][a-z0-9_]{0,${TWITCH_LOGIN_MAX_LENGTH - 1}}$`,
  "u",
);

export const TRACKED_STREAMER_NAME_MAX_LENGTH = 100;

export function twitchChannelUrl(login: string): string {
  return `https://twitch.tv/${login}`;
}
