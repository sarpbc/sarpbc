import {
  getLoadedPostHogClient,
  loadPostHogClient,
  setPostHogConsent,
} from "~/utils/posthog-client";

export default defineNuxtPlugin(() => {
  const router = useRouter();
  const { choice } = useCookieConsent();
  const config = useRuntimeConfig();
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
    { immediate: true, flush: "sync" },
  );

  router.afterEach((to, from, failure) => {
    if (failure || to.fullPath === from.fullPath) {
      return;
    }

    capturePageview(to.fullPath);
  });
});
