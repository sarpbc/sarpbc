import { z } from "zod";
import { IntegrationError } from "../../../common/domain/errors";
import type { BallchasingSource } from "../../application/ports";
import type { ReplaySummary, ReplayTeam } from "../../domain/replay-matching";

export const BALLCHASING_API_URL = "https://ballchasing.com/api";

type Endpoint = "list" | "group" | "file";

/** Spacing for the lowest Ballchasing tier: 2 calls/s for lists and groups, 1 file/s. */
export const DEFAULT_INTERVALS_MS = { list: 500, group: 500, file: 1000 } satisfies Record<
  Endpoint,
  number
>;
const TIMEOUT_MS = { list: 30_000, group: 30_000, file: 120_000 } satisfies Record<
  Endpoint,
  number
>;
const PAGE_SIZE = 200;
const MAX_RATE_LIMIT_RETRIES = 5;
const DEFAULT_COOLDOWN_MS = 60_000;

const team = z.object({
  name: z.string().optional(),
  goals: z.number().int().nonnegative().optional(),
  players: z.array(z.object({ name: z.string() })).optional(),
});

const replayList = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      rocket_league_id: z.string().optional(),
      replay_title: z.string().optional(),
      date: z.string().optional(),
      date_has_tz: z.boolean().optional(),
      blue: team.optional(),
      orange: team.optional(),
    }),
  ),
  next: z.string().optional(),
});

const groupList = z.object({
  list: z.array(z.object({ id: z.string() })),
  next: z.string().optional(),
});

type ListedReplay = z.infer<typeof replayList>["list"][number];

function toTeam(side: z.infer<typeof team> | undefined): ReplayTeam {
  return {
    name: side?.name?.trim() || null,
    goals: side?.goals ?? 0,
    playerNames: (side?.players ?? []).map((player) => player.name),
  };
}

function playedAt(replay: ListedReplay): Date | null {
  if (!replay.date) return null;
  // Without a timezone Ballchasing gives the uploader's wall clock; reading it as UTC keeps the order.
  const value = replay.date_has_tz
    ? replay.date
    : `${replay.date.replace(/(Z|[+-]\d\d:\d\d)$/, "")}Z`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toSummary(replay: ListedReplay): ReplaySummary {
  return {
    id: replay.id,
    rocketLeagueId: replay.rocket_league_id ?? null,
    title: replay.replay_title ?? replay.id,
    playedAt: playedAt(replay),
    playedAtHasTimezone: replay.date_has_tz === true,
    blue: toTeam(replay.blue),
    orange: toTeam(replay.orange),
  };
}

export interface BallchasingClientOptions {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  intervalsMs?: Record<Endpoint, number>;
}

export class BallchasingClient implements BallchasingSource {
  private readonly fetch: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly intervalsMs: Record<Endpoint, number>;
  private readonly nextSlot = new Map<Endpoint, number>();

  constructor(
    private readonly apiKey: string,
    options: BallchasingClientOptions = {},
  ) {
    this.fetch = options.fetch ?? fetch;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.now = options.now ?? Date.now;
    this.intervalsMs = options.intervalsMs ?? DEFAULT_INTERVALS_MS;
  }

  async groupReplays(groupId: string): Promise<ReplaySummary[]> {
    await this.request("group", `${BALLCHASING_API_URL}/groups/${encodeURIComponent(groupId)}`);
    const replays = new Map<string, ReplaySummary>();
    const visited = new Set<string>();
    const queue = [groupId];
    while (queue.length > 0) {
      const group = queue.shift() as string;
      if (visited.has(group)) continue;
      visited.add(group);
      for (const replay of await this.pages(replayList, "replays", group))
        replays.set(replay.id, toSummary(replay));
      for (const child of await this.pages(groupList, "groups", group)) queue.push(child.id);
    }
    return [...replays.values()];
  }

  async download(replayId: string): Promise<Uint8Array> {
    const response = await this.request(
      "file",
      `${BALLCHASING_API_URL}/replays/${encodeURIComponent(replayId)}/file`,
    );
    return new Uint8Array(await response.arrayBuffer());
  }

  private async pages<T extends typeof replayList | typeof groupList>(
    schema: T,
    resource: "replays" | "groups",
    group: string,
  ): Promise<z.infer<T>["list"]> {
    const items: z.infer<T>["list"] = [];
    const first = new URL(`${BALLCHASING_API_URL}/${resource}`);
    first.searchParams.set("group", group);
    first.searchParams.set("count", String(PAGE_SIZE));
    let url: string | undefined = first.toString();
    while (url) {
      const response = await this.request("list", url);
      const page = schema.safeParse(await response.json());
      if (!page.success)
        throw new IntegrationError("Ballchasing returned an unexpected response. Try again later.");
      items.push(...page.data.list);
      url = page.data.next;
      // The key travels with every request, so never follow a link off the API host.
      if (url && !url.startsWith(`${BALLCHASING_API_URL}/`))
        throw new IntegrationError("Ballchasing returned an unexpected response. Try again later.");
    }
    return items;
  }

  private async request(endpoint: Endpoint, url: string): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      await this.waitForSlot(endpoint);
      let response: Response;
      try {
        response = await this.fetch(url, {
          headers: { Authorization: this.apiKey },
          signal: AbortSignal.timeout(TIMEOUT_MS[endpoint]),
        });
      } catch {
        throw new IntegrationError("Ballchasing could not be reached. Try again later.");
      }
      if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await this.sleep(
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : DEFAULT_COOLDOWN_MS,
        );
        continue;
      }
      if (response.ok) return response;
      throw this.failure(response.status, url);
    }
  }

  private async waitForSlot(endpoint: Endpoint): Promise<void> {
    const now = this.now();
    const slot = Math.max(now, this.nextSlot.get(endpoint) ?? 0);
    this.nextSlot.set(endpoint, slot + this.intervalsMs[endpoint]);
    if (slot > now) await this.sleep(slot - now);
  }

  private failure(status: number, url: string): IntegrationError {
    if (status === 401 || status === 403)
      return new IntegrationError("Ballchasing rejected the API key. Check BALLCHASING_API_KEY.");
    if (status === 404)
      return new IntegrationError(
        url.includes("/groups/")
          ? "This Ballchasing group does not exist or is private. Check the link and its visibility."
          : "A Ballchasing replay is no longer available.",
      );
    if (status === 429)
      return new IntegrationError(
        "Ballchasing rate limit reached. Wait an hour or use a key with a higher patron tier, then run the import again.",
      );
    return new IntegrationError(`Ballchasing answered with status ${status}. Try again later.`);
  }
}
