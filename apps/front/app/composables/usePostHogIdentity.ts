import type { User } from "~/types/user";
import { loadPostHogClient } from "~/utils/posthog-client";

export function usePostHogIdentity() {
  const { isAccepted } = useCookieConsent();
  const config = useRuntimeConfig();

  const identifyUser = (profile: User | null | undefined) => {
    if (!isAccepted() || !profile) {
      return;
    }

    void loadPostHogClient(config.public.posthog).then((client) => {
      client?.identify(profile.id, {
        userName: profile.userName,
        email: profile.email,
      });
    });
  };

  const clearIdentity = () => {
    void loadPostHogClient(config.public.posthog).then((client) => {
      client?.reset();
    });
  };

  return { identifyUser, clearIdentity };
}
