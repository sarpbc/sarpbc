type AuthEvent = "user_logged_in" | "user_signed_up";

export function useAuthFlow() {
  const route = useRoute();
  const localePath = useLocalePath();
  const posthog = usePostHog();
  const user = useUser();
  const { apiBase } = useRuntimeConfig().public;

  function redirectTarget(): string {
    const raw = route.query.redirect;

    if (Array.isArray(raw) || raw == null || !raw.startsWith("/") || raw.startsWith("//")) {
      return localePath("/");
    }

    return raw;
  }

  async function leaveIfSignedIn(): Promise<void> {
    if (user.value === undefined) {
      user.value = await getProfile();
    }

    if (user.value) {
      void navigateTo(redirectTarget());
    }
  }

  async function submit(
    path: "/auth/login" | "/auth/signup",
    body: Record<string, string>,
    event: AuthEvent,
  ): Promise<boolean> {
    const res = await apiFetch<{ success?: boolean }>(path, { method: "POST", body });

    if (res.success !== true) {
      return false;
    }

    const profile = await getProfile();
    user.value = profile;

    if (profile) {
      posthog?.capture(event);
    }

    void navigateTo(redirectTarget());

    return true;
  }

  function googleLogin(): void {
    window.location.href = `${apiBase}/auth/google`;
  }

  return { leaveIfSignedIn, submit, googleLogin };
}
