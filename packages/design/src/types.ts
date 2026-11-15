/*
 * Closed sets: every value here is a design decision, not an option. The UI is
 * dense by default; `sm` is for tables and toolbars.
 */

/** primary: the screen's main action. secondary: other actions. tertiary: quiet ones (row icons, toolbars). */
export const BUTTON_VARIANTS = ["primary", "secondary", "tertiary"] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const BUTTON_SIZES = ["sm", "md"] as const;

export type ButtonSize = (typeof BUTTON_SIZES)[number];

/** Badges carry a status, never a decoration. */
export const BADGE_COLORS = ["neutral", "info", "success", "warning", "danger"] as const;

export type BadgeColor = (typeof BADGE_COLORS)[number];

export type KbdSize = "sm" | "md";
