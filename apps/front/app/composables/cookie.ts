export type CookieChoice = "accepted" | "rejected";

const COOKIE_NAME = "cookieConsent";

function readLegacyChoice(): CookieChoice | null {
  if (!import.meta.client) {
    return null;
  }

  const value = localStorage.getItem(COOKIE_NAME);
  if (value === "accepted" || value === "rejected") {
    return value;
  }

  return null;
}

export const useCookieConsent = () => {
  const choiceCookie = useCookie<CookieChoice | null>(COOKIE_NAME, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  if (import.meta.client && !choiceCookie.value) {
    const legacyChoice = readLegacyChoice();
    if (legacyChoice) {
      choiceCookie.value = legacyChoice;
    }
  }

  const visible = useState<boolean>("cookieConsentVisible", () => choiceCookie.value === null);

  const open = () => {
    visible.value = true;
  };

  const close = () => {
    visible.value = false;
  };

  const getChoice = (): CookieChoice | null => {
    const value = choiceCookie.value;
    if (value === "accepted" || value === "rejected") {
      return value;
    }

    return null;
  };

  const hasChoice = () => getChoice() !== null;

  const isAccepted = () => getChoice() === "accepted";

  const setChoice = (value: CookieChoice) => {
    choiceCookie.value = value;
    if (import.meta.client) {
      localStorage.setItem(COOKIE_NAME, value);
    }
  };

  return {
    visible: visible as Ref<boolean>,
    open,
    close,
    getChoice,
    hasChoice,
    isAccepted,
    setChoice,
  };
};
