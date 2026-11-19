import type { ColumnDef, Row, RowData } from "@tanstack/vue-table";

/** primary: the screen's main action. secondary: other actions. tertiary: quiet ones (row icons, toolbars). */
export const BUTTON_VARIANTS = ["primary", "secondary", "tertiary"] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const BUTTON_SIZES = ["sm", "md"] as const;

export type ButtonSize = (typeof BUTTON_SIZES)[number];

/** Badges carry a status, never a decoration. */
export const BADGE_COLORS = ["neutral", "info", "success", "warning", "danger"] as const;

export type BadgeColor = (typeof BADGE_COLORS)[number];

export type KbdSize = "sm" | "md";

/** primary: every link by default (navigation, names, meta). secondary: a link inside running text, with a dashed underline. */
export const LINK_VARIANTS = ["primary", "secondary"] as const;

export type LinkVariant = (typeof LINK_VARIANTS)[number];

export type OverlaySide = "top" | "right" | "bottom" | "left";

export type OverlayAlign = "start" | "center" | "end";

/** md fits a form; the larger sizes hold tables and editors. */
export type ModalSize = "md" | "lg" | "xl" | "2xl";

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
  /** For screen readers when the label is an abbreviation, e.g. "EN" read as "English". */
  ariaLabel?: string;
  description?: string;
  disabled?: boolean;
  label: string;
  value: T;
}

export type RadioStatus = "success" | "danger";

export interface SelectGroup<T extends SelectValue = SelectValue> {
  label: string;
  options: readonly SelectOption<T>[];
}

/** TanStack column definitions: `accessorKey`, `header`, `cell`, or an `id` filled by a `#<id>-cell` slot. */
export type TableColumn<T> = ColumnDef<T>;

export type TableRow<T> = Row<T>;

export interface BreadcrumbItem {
  label: string;
  /** Omitted for a level that has no page of its own. */
  to?: string;
}

export interface NavigationItem {
  /** Set when the router alone cannot tell, e.g. a section spanning several paths. */
  active?: boolean;
  icon?: string;
  label: string;
  target?: "_blank";
  to: string;
}

export type ToastColor = "success" | "info" | "warning" | "danger";

/** A short confirmation or failure after an action; it dismisses itself. */
export interface ToastMessage {
  color: ToastColor;
  description?: string;
  title: string;
}

export interface CommandItem {
  icon?: string;
  id: string;
  /** A logo or photo; it replaces the icon. */
  image?: string;
  label: string;
  loading?: boolean;
  onSelect: () => void;
  suffix?: string;
}

export interface CommandGroup {
  id: string;
  items: readonly CommandItem[];
  label: string;
  /** Items already match the search (server results), so the palette does not filter them. */
  remote?: boolean;
}

/** A row of an ActionList: choosing it acts at once. */
export interface ActionItem {
  /** Tints the description: the action cannot be undone or ends something. */
  danger?: boolean;
  description?: string;
  label: string;
  value: string;
}

/** The column a Table is sorted by; the parent sorts the data. */
export interface TableSort {
  desc: boolean;
  id: string;
}

declare module "@tanstack/vue-table" {
  /** Per-column presentation: numbers align at the end; a row header names the row for screen readers. */
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "start" | "end";
    rowHeader?: boolean;
  }
}
