import type { LiveStreamSource } from "../../application/ports/live-stream-source";
import { TwitchAppToken } from "./twitch-app-token";
import { TwitchHelixSource } from "./twitch-helix-source";

export function createTwitchSource(
  clientId: string | undefined,
  clientSecret: string | undefined,
): LiveStreamSource | null {
  if (!clientId || !clientSecret) return null;
  return new TwitchHelixSource(clientId, new TwitchAppToken({ clientId, clientSecret }));
}
