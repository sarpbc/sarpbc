/**
 * Surfaces OAuth / auth redirect errors from `?authError=` (set by Nest Google callback).
 */
export default defineNuxtPlugin(() => {
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();

  const showAuthError = (code: unknown) => {
    if (typeof code !== "string" || !code) {
      return;
    }

    const titleKey =
      code === "google_link"
        ? "page.authentication.errors.googleLinkFailed"
        : "page.authentication.errors.googleFailed";

    toast.add({
      title: t(titleKey),
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
