import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PostHog } from "posthog-node";

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private readonly client: PostHog | null;

  constructor() {
    const token = process.env.POSTHOG_PROJECT_TOKEN;
    const enabled = process.env.NODE_ENV === "production" && !!token;

    this.client = enabled
      ? new PostHog(token!, {
          host: process.env.POSTHOG_HOST || "https://eu.i.posthog.com",
          flushAt: 1,
          flushInterval: 0,
        })
      : null;
  }

  capture(params: {
    distinctId: string | undefined;
    event: string;
    properties?: Record<string, unknown>;
    sessionId?: string | undefined;
  }): void {
    if (!this.client || !params.distinctId) return;

    this.client.capture({
      distinctId: params.distinctId,
      event: params.event,
      properties: {
        ...(params.sessionId ? { $session_id: params.sessionId } : {}),
        ...params.properties,
      },
    });
  }

  async flush(): Promise<void> {
    await this.client?.flush();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.shutdown();
  }
}
