import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PostHog } from "posthog-node";

export type PostHogProperties = Record<string, string | number | boolean | null>;

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private readonly client: PostHog | null;

  constructor(configService: ConfigService) {
    const token = configService.get<string>("posthog.token");
    const enabled = configService.get<boolean>("production") === true;

    this.client =
      enabled && token !== undefined && token !== ""
        ? new PostHog(token, {
            host: configService.get<string>("posthog.host"),
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
    if (!this.client || params.distinctId === undefined || params.distinctId === "") {
      return;
    }

    const base = {
      ...params.properties,
      $process_person_profile: false,
    } satisfies PostHogProperties;

    const properties =
      params.sessionId !== undefined && params.sessionId !== ""
        ? { ...base, $session_id: params.sessionId }
        : base;

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
