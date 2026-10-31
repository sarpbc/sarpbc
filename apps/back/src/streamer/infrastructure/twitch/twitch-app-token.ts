import { z } from "zod";

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const REFRESH_MARGIN_MS = 5 * 60_000;
export const TOKEN_REQUEST_TIMEOUT_MS = 5_000;

const tokenResponse = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});

export interface TwitchCredentials {
  clientId: string;
  clientSecret: string;
}

export class TwitchAppToken {
  private cached: { value: string; refreshAt: number } | null = null;
  private pending: Promise<string> | null = null;

  constructor(
    private readonly credentials: TwitchCredentials,
    private readonly now: () => number = Date.now,
  ) {}

  async get(): Promise<string> {
    if (this.cached && this.now() < this.cached.refreshAt) {
      return this.cached.value;
    }
    this.pending ??= this.request().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  invalidate(rejected: string): void {
    if (this.cached?.value === rejected) this.cached = null;
  }

  private async request(): Promise<string> {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      body: new URLSearchParams({
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Twitch token request failed with status ${response.status}`);
    }
    const token = tokenResponse.parse(await response.json());
    const lifetimeMs = token.expires_in * 1000;
    this.cached = {
      value: token.access_token,
      refreshAt: this.now() + lifetimeMs - Math.min(REFRESH_MARGIN_MS, lifetimeMs / 2),
    };
    return token.access_token;
  }
}
