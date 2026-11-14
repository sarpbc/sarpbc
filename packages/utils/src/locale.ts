import type { SupportedLocale } from "@sarpbc/types";

export type UiLocale = "en" | "fr";

export const parseLocale = (raw?: string | null): SupportedLocale =>
  raw?.trim().toLowerCase().startsWith("fr") === true ? "fr-FR" : "en-US";

export const uiLocale = (raw?: string | null): UiLocale =>
  parseLocale(raw) === "fr-FR" ? "fr" : "en";
