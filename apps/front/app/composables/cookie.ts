export type CookieChoice = "accepted" | "rejected";

export const useCookieConsent = () => {
  const visible = useState<boolean>("cookieConsentVisible", () => false);

  const open = () => {
    visible.value = true;
  };

  const close = () => {
    visible.value = false;
  };

  const hasChoice = () => {
    if (import.meta.client) {
      return !!localStorage.getItem("cookieConsent");
    }
    return false;
  };

  const setChoice = (value: CookieChoice) => {
    if (import.meta.client) {
      localStorage.setItem("cookieConsent", value);
    }
  };

  return {
    visible: visible as Ref<boolean>,
    open,
    close,
    hasChoice,
    setChoice,
  };
};
