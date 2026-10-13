import {
  getLoadedPostHogClient,
  loadPostHogClient,
  setPostHogConsent,
} from "~/utils/posthog-client";

export default defineNuxtPlugin(() => {
  const router = useRouter();
  const { choice, isAccepted } = useCookieConsent();
  const config = useRuntimeConfig();
  let lastPageview: string | null = null;

  const capturePageview = (fullPath = router.currentRoute.value.fullPath) => {
    const client = getLoadedPostHogClient();
    if (!isAccepted() || !client?.has_opted_in_capturing() || lastPageview === fullPath) {
      return;
    }

    lastPageview = fullPath;
    const path = fullPath.split(/[?#]/)[0];
    client.capture("$pageview", {
      $current_url: `${window.location.origin}${path}`,
      page_path: path,
    });
  };

  watch(
    choice,
    () => {
      const accepted = isAccepted();
      setPostHogConsent(accepted);
      lastPageview = null;
      if (!accepted) {
        return;
      }

      void loadPostHogClient(config.public.posthog).then(async () => {
        await router.isReady();
        capturePageview();
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
