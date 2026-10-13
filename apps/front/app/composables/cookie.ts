export type CookieChoice = "accepted" | "rejected";

// Previous cookie consent did not cover session replay.
const COOKIE_NAME = "analyticsConsent";

export const useCookieConsent = () => {
  const choiceCookie = useCookie<CookieChoice | null>(COOKIE_NAME, {
    maxAge: 60 * 60 * 24 * 180,
    sameSite: "lax",
  });
  const choice = useState<CookieChoice | null>(COOKIE_NAME, () => choiceCookie.value ?? null);
  watch(
    choiceCookie,
    (value) => {
      choice.value = value ?? null;
    },
    { immediate: import.meta.client, flush: "sync" },
  );
  const visible = useState<boolean>("cookieConsentVisible", () => !choice.value);

  const open = () => {
    visible.value = true;
  };

  const close = () => {
    visible.value = false;
  };

  const getChoice = (): CookieChoice | null => {
    const value = choice.value;
    if (value === "accepted" || value === "rejected") {
      return value;
    }

    return null;
  };

  const hasChoice = () => getChoice() !== null;

  const isAccepted = () => getChoice() === "accepted";

  const setChoice = (value: CookieChoice) => {
    choice.value = value;
    choiceCookie.value = value;
  };

  return {
    choice: readonly(choice),
    visible: visible as Ref<boolean>,
    open,
    close,
    getChoice,
    hasChoice,
    isAccepted,
    setChoice,
  };
};
