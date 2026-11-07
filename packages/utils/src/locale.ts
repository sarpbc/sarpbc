import type { SupportedLocale } from "@sarpbc/types";

export type UiLocale = "en" | "fr";

export function parseLocale(raw?: string | null): SupportedLocale {
  return raw?.trim().toLowerCase().startsWith("fr") ? "fr-FR" : "en-US";
}

export function uiLocale(raw?: string | null): UiLocale {
  return parseLocale(raw) === "fr-FR" ? "fr" : "en";
}
