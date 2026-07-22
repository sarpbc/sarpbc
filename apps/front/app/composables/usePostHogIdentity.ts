import type { User } from "~/types/user";

export function usePostHogIdentity() {
  const posthog = usePostHog();
  const { isAccepted } = useCookieConsent();

  const identifyUser = (profile: User | null | undefined) => {
    if (!isAccepted() || !profile) return;
    posthog?.identify(profile.id, {
      userName: profile.userName,
      email: profile.email,
    });
  };

  const clearIdentity = () => {
    posthog?.reset();
  };

  return { identifyUser, clearIdentity };
}
