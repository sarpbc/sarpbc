export type CookieChoice = "accepted" | "rejected";

export const useCookieConsent = () => {
  const visible = useState<boolean>("cookieConsentVisible", () => false);

  const open = () => {
    visible.value = true;
  };

  const close = () => {
    visible.value = false;
  };

  const getChoice = (): CookieChoice | null => {
    if (!import.meta.client) return null;
    const value = localStorage.getItem("cookieConsent");
    if (value === "accepted" || value === "rejected") return value;
    return null;
  };

  const hasChoice = () => getChoice() !== null;

  const isAccepted = () => getChoice() === "accepted";

  const setChoice = (value: CookieChoice) => {
    if (import.meta.client) {
      localStorage.setItem("cookieConsent", value);
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
