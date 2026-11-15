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

/** muted: secondary navigation. inline: links inside running text. accent: a link that must stand out. */
export const LINK_VARIANTS = ["muted", "inline", "accent"] as const;

export type LinkVariant = (typeof LINK_VARIANTS)[number];

/** Where a tooltip, popover or menu opens relative to its trigger. */
export type OverlaySide = "top" | "right" | "bottom" | "left";

export type OverlayAlign = "start" | "center" | "end";

/** md fits a form; the larger sizes hold tables and editors. */
export type ModalSize = "md" | "lg" | "xl" | "2xl";

/** One action in a dropdown menu. */
export interface MenuItem {
  danger?: boolean;
  disabled?: boolean;
  icon?: string;
  label: string;
  onSelect: () => void;
}

/** xs: 24px, in nav rows. sm: 28px, in lists. lg: 40px, on a profile header. */
export type AvatarSize = "xs" | "sm" | "lg";

export type SelectValue = string | number;

/** One choice in a Select, Combobox or RadioGroup; the description explains it under the label. */
export interface SelectOption<T extends SelectValue = SelectValue> {
  description?: string;
  disabled?: boolean;
  label: string;
  value: T;
}

/** list: a dot and a label. cards: the whole option is a tile, for a few short choices. */
export type RadioVariant = "list" | "cards";

export type RadioStatus = "success" | "danger";

/** Options under a heading, e.g. the players of each team. */
export interface SelectGroup<T extends SelectValue = SelectValue> {
  label: string;
  options: readonly SelectOption<T>[];
}
