/**
 * Do not call `useI18n()` here — vue-i18n requires a component setup instance.
 * Use `nuxtApp.$i18n` from `@nuxtjs/i18n` instead.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();
  const { $i18n: i18n } = nuxtApp;

  const showAuthError = (code: string | (string | null)[] | null | undefined) => {
    if (Array.isArray(code) || code === null || code === undefined || code === "") {
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

    const { authError: _authError, ...query } = route.query;
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
