export const TWITCH_LOGIN_PATTERN = /^[a-z0-9][a-z0-9_]{0,24}$/;

export function twitchChannelUrl(login: string): string {
  return `https://twitch.tv/${login}`;
}
