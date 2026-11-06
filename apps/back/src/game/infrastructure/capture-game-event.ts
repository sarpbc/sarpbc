import type { PostHogService } from "../../infrastructure/telemetry/posthog.service";

type Properties = Parameters<PostHogService["capture"]>[0]["properties"];

export async function captureGameEvent(
  posthog: PostHogService,
  headers: Record<string, string | string[] | undefined>,
  event: string,
  properties: Properties,
): Promise<void> {
  posthog.capture({
    distinctId: headers["x-posthog-distinct-id"] as string | undefined,
    event,
    sessionId: headers["x-posthog-session-id"] as string | undefined,
    properties,
  });
  await posthog.flush();
}
