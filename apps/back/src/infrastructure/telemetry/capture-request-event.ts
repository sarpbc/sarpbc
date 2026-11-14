import type { PostHogProperties, PostHogService } from "./posthog.service";

function singleHeader(value: string | string[] | undefined): string | undefined {
  if (!Array.isArray(value)) {
    return value;
  }

  const [first]: (string | undefined)[] = value;

  return first;
}

export async function captureRequestEvent(
  posthog: PostHogService,
  headers: Record<string, string | string[] | undefined>,
  event: string,
  properties?: PostHogProperties,
): Promise<void> {
  posthog.capture({
    distinctId: singleHeader(headers["x-posthog-distinct-id"]),
    event,
    sessionId: singleHeader(headers["x-posthog-session-id"]),
    properties,
  });
  await posthog.flush();
}
