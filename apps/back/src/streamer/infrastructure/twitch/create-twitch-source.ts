import type { LiveStreamSource } from "../../application/ports/live-stream-source";
import { TwitchAppToken } from "./twitch-app-token";
import { TwitchHelixSource } from "./twitch-helix-source";

export const createTwitchSource = (
  clientId: string | undefined,
  clientSecret: string | undefined,
): LiveStreamSource | null => {
  if (
    clientId === undefined ||
    clientId === "" ||
    clientSecret === undefined ||
    clientSecret === ""
  ) {
    return null;
  }

  return new TwitchHelixSource(clientId, new TwitchAppToken({ clientId, clientSecret }));
};
