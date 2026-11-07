import type { PostHogProperties, PostHogService } from "./posthog.service";

export async function captureRequestEvent(
  posthog: PostHogService,
  headers: Record<string, string | string[] | undefined>,
  event: string,
  properties?: PostHogProperties,
): Promise<void> {
  posthog.capture({
    distinctId: headers["x-posthog-distinct-id"] as string | undefined,
    event,
    sessionId: headers["x-posthog-session-id"] as string | undefined,
    properties,
  });
  await posthog.flush();
}
