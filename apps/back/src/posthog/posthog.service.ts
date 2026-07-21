import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PostHog } from "posthog-node";

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private readonly client: PostHog;

  constructor() {
    this.client = new PostHog(process.env.POSTHOG_PROJECT_TOKEN || "", {
      host: process.env.POSTHOG_HOST || "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }

  capture(params: {
    distinctId: string | undefined;
    event: string;
    properties?: Record<string, unknown>;
    sessionId?: string | undefined;
  }): void {
    if (!params.distinctId) return;

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
    await this.client.flush();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.shutdown();
  }
}
