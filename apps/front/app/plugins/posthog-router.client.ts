import { loadPostHogClient } from "~/utils/posthog-client";

export default defineNuxtPlugin(() => {
  const router = useRouter();
  const { isAccepted } = useCookieConsent();
  const config = useRuntimeConfig();

  const capturePageview = () => {
    if (!isAccepted()) {
      return;
    }

    void loadPostHogClient(config.public.posthog).then((client) => {
      client?.capture("$pageview");
    });
  };

  router.isReady().then(() => {
    capturePageview();
  });

  router.afterEach((to, from) => {
    if (to.fullPath === from.fullPath) {
      return;
    }

    capturePageview();
  });
});
