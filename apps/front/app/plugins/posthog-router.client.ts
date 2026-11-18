import {
  getLoadedPostHogClient,
  loadPostHogClient,
  setPostHogConsent,
  setPostHogUser,
} from "~/utils/posthog-client";

export default defineNuxtPlugin(() => {
  const router = useRouter();
  const { choice } = useCookieConsent();
  const config = useRuntimeConfig();
  const user = useUser();
  let lastPageview: string | null = null;

  const capturePageview = (fullPath = router.currentRoute.value.fullPath) => {
    const client = getLoadedPostHogClient();

    if (
      choice.value !== "accepted" ||
      client?.has_opted_in_capturing() !== true ||
      lastPageview === fullPath
    ) {
      return;
    }

    lastPageview = fullPath;
    const [path] = fullPath.split(/[?#]/u);
    client.capture("$pageview", {
      $current_url: `${window.location.origin}${path}`,
      page_path: path,
    });
  };

  watch(user, setPostHogUser, { flush: "sync", immediate: true });

  watch(
    choice,
    () => {
      const accepted = choice.value === "accepted";
      setPostHogConsent(accepted, config.public.apiBase);
      lastPageview = null;

      if (!accepted) {
        return;
      }

      void loadPostHogClient(config.public.posthog).then(async () => {
        await router.isReady();
        capturePageview();

        return true;
      });
    },
    { flush: "sync", immediate: true },
  );

  router.afterEach((to, from, failure) => {
    if (failure || to.fullPath === from.fullPath) {
      return;
    }

    capturePageview(to.fullPath);
  });
});
