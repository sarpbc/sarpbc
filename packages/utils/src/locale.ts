export type UiLocale = "en" | "fr";

export const parseLocale = (raw?: string | null) =>
  raw?.trim().toLowerCase().startsWith("fr") === true ? "fr-FR" : "en-US";

export const uiLocale = (raw?: string | null) => (parseLocale(raw) === "fr-FR" ? "fr" : "en");
