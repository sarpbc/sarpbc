/**
 * Surfaces OAuth / auth redirect errors from `?authError=` (set by Nest Google callback).
 *
 * Do not call `useI18n()` here — vue-i18n requires a component setup instance.
 * Use `nuxtApp.$i18n` from `@nuxtjs/i18n` instead.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();
  const i18n = nuxtApp.$i18n as { t: (key: string) => string };

  const showAuthError = (code: unknown) => {
    if (typeof code !== "string" || !code) {
      return;
    }

    const titleKey =
      code === "google_link"
        ? "page.authentication.errors.googleLinkFailed"
        : "page.authentication.errors.googleFailed";

    toast.add({
      title: i18n.t(titleKey),
      color: "error",
    });

    const query = { ...route.query };
    delete query.authError;
    void router.replace({ query });
  };

  watch(
    () => route.query.authError,
    (code) => {
      showAuthError(code);
    },
    { immediate: true },
  );
});
