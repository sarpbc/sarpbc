export const TWITCH_LOGIN_PATTERN = /^[a-z0-9_]{4,25}$/;

export function twitchChannelUrl(login: string): string {
  return `https://twitch.tv/${login}`;
}
