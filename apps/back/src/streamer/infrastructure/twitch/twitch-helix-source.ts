import { z } from "zod";
import type { LiveStreamSource, SourceStream } from "../../application/ports/live-stream-source";
import type { TwitchAppToken } from "./twitch-app-token";

export const ROCKET_LEAGUE_GAME_ID = "30921";
export const HELIX_LOGINS_PER_REQUEST = 100;

const STREAMS_URL = "https://api.twitch.tv/helix/streams";
const REQUEST_TIMEOUT_MS = 5_000;

const streamsResponse = z.object({
  data: z.array(
    z.object({
      user_login: z.string(),
      user_name: z.string(),
      game_id: z.string(),
      type: z.string(),
      title: z.string(),
      viewer_count: z.number().int().nonnegative(),
    }),
  ),
});

type HelixStream = z.infer<typeof streamsResponse>["data"][number];

export class TwitchHelixSource implements LiveStreamSource {
  constructor(
    private readonly clientId: string,
    private readonly token: TwitchAppToken,
  ) {}

  async findLiveRocketLeague(logins: readonly string[]): Promise<SourceStream[]> {
    const batches: string[][] = [];
    for (let start = 0; start < logins.length; start += HELIX_LOGINS_PER_REQUEST) {
      batches.push(logins.slice(start, start + HELIX_LOGINS_PER_REQUEST));
    }
    const results = await Promise.all(batches.map((batch) => this.fetchStreams(batch)));
    return results
      .flat()
      .filter((stream) => stream.type === "live" && stream.game_id === ROCKET_LEAGUE_GAME_ID)
      .map((stream) => ({
        login: stream.user_login,
        displayName: stream.user_name,
        title: stream.title,
        viewerCount: stream.viewer_count,
      }));
  }

  private async fetchStreams(logins: string[]): Promise<HelixStream[]> {
    const url = new URL(STREAMS_URL);
    for (const login of logins) url.searchParams.append("user_login", login);
    url.searchParams.set("first", String(HELIX_LOGINS_PER_REQUEST));

    let token = await this.token.get();
    let response = await this.request(url, token);
    if (response.status === 401) {
      this.token.invalidate(token);
      token = await this.token.get();
      response = await this.request(url, token);
    }
    if (!response.ok) {
      throw new Error(`Twitch streams request failed with status ${response.status}`);
    }
    return streamsResponse.parse(await response.json()).data;
  }

  private request(url: URL, token: string): Promise<Response> {
    return fetch(url, {
      headers: { "Client-Id": this.clientId, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }
}
