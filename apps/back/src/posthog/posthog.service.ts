import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PostHog } from "posthog-node";

export interface PostHogProperties {
  [key: string]: string | number | boolean | null;
}

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private readonly client: PostHog | null;

  constructor(configService: ConfigService) {
    const token = configService.get<string>("posthog.token");
    const enabled = configService.get<boolean>("production") === true && Boolean(token);

    this.client = enabled
      ? new PostHog(token!, {
          host: configService.get<string>("posthog.host") || "https://eu.i.posthog.com",
          flushAt: 1,
          flushInterval: 0,
        })
      : null;
  }

  capture(params: {
    distinctId: string | undefined;
    event: string;
    properties?: PostHogProperties;
    sessionId?: string | undefined;
  }): void {
    if (!this.client || !params.distinctId) return;

    const properties: PostHogProperties = { ...params.properties };
    if (params.sessionId) {
      properties.$session_id = params.sessionId;
    }

    this.client.capture({
      distinctId: params.distinctId,
      event: params.event,
      properties,
    });
  }

  async flush(): Promise<void> {
    await this.client?.flush();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.shutdown();
  }
}
