import type { ComponentUsage, ScannedSource } from "./inventory/types.ts";

export const CATEGORIES = [
  "Actions",
  "Forms",
  "Overlays",
  "Navigation",
  "Data display",
  "Feedback",
  "Editor",
  "App shell",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

const CATEGORY_BY_COMPONENT: ReadonlyMap<string, Category> = new Map([
  ["UApp", "App shell"],
  ["UAvatar", "Data display"],
  ["UBadge", "Data display"],
  ["UBreadcrumb", "Navigation"],
  ["UButton", "Actions"],
  ["UCheckbox", "Forms"],
  ["UCommandPalette", "Overlays"],
  ["UDropdownMenu", "Overlays"],
  ["UEditor", "Editor"],
  ["UEditorDragHandle", "Editor"],
  ["UEditorSuggestionMenu", "Editor"],
  ["UEditorToolbar", "Editor"],
  ["UError", "Feedback"],
  ["UForm", "Forms"],
  ["UFormField", "Forms"],
  ["UIcon", "Data display"],
  ["UInput", "Forms"],
  ["UInputMenu", "Forms"],
  ["UInputNumber", "Forms"],
  ["UKbd", "Actions"],
  ["ULink", "Actions"],
  ["UModal", "Overlays"],
  ["UNavigationMenu", "Navigation"],
  ["UPagination", "Navigation"],
  ["UPopover", "Overlays"],
  ["URadioGroup", "Forms"],
  ["USelect", "Forms"],
  ["USelectMenu", "Forms"],
  ["USeparator", "Data display"],
  ["USkeleton", "Feedback"],
  ["USlideover", "Overlays"],
  ["USwitch", "Forms"],
  ["UTable", "Data display"],
  ["UTabs", "Navigation"],
  ["UTextarea", "Forms"],
  ["UTheme", "App shell"],
  ["UTooltip", "Overlays"],
  ["UUser", "Data display"],
]);

export const categoryOf = (component: ComponentUsage): Category =>
  CATEGORY_BY_COMPONENT.get(component.name) ?? "Other";

const kebab = (name: string): string =>
  name.replaceAll(/(?<!^)(?<upper>[A-Z])/gu, "-$<upper>").toLowerCase();

export const docsUrl = (name: string): string =>
  `https://ui.nuxt.com/docs/components/${kebab(name.replace(/^U/u, ""))}`;

export const countIn = (component: ComponentUsage, source: ScannedSource): number =>
  component.sources.find((tally) => tally.source === source)?.count ?? 0;

export { default as inventory } from "virtual:nuxt-ui-inventory";
