import { PostHog } from "posthog-node";

let client: PostHog | null = null;

export function useServerPostHog(): PostHog | null {
  if (process.env.NODE_ENV !== "production") return null;

  if (!client) {
    const config = useRuntimeConfig();
    const posthogConfig = config.public.posthog;
    if (!posthogConfig.publicKey) return null;

    client = new PostHog(posthogConfig.publicKey, {
      host: posthogConfig.host,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}
