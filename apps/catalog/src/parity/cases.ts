import {
  Badge,
  Button,
  FormField,
  Input,
  Kbd,
  Separator,
  Skeleton,
  Textarea,
} from "@sarpbc/design";
import { h } from "vue";

import type { BadgeColor, ButtonSize, ButtonVariant } from "@sarpbc/design";
import type { StyleVariant } from "../styles/types.ts";
import type { VNode } from "vue";

/*
 * One migration case per replaced component. For every look production renders
 * today, `reference` draws it with Nuxt UI's resolved classes, `migrate` maps
 * its props to the new API (the codemod's specification) and `render` draws the
 * result with the same sample content.
 *
 * Nuxt UI applies two variants from component defaults rather than props (form
 * field `orientation: vertical`, separator `horizontal` + `xs`); their
 * declarations are inlined because the resolver only sees passed props.
 */
export type MigratedProp = readonly [name: string, value: string | boolean];

export type MigratedProps = readonly MigratedProp[];

export interface ParityCase {
  migrate: (look: StyleVariant) => MigratedProps;
  name: string;
  nuxtUi: string;
  reference: (look: StyleVariant) => string;
  render: (props: MigratedProps) => VNode;
}

const ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display:block;width:100%;height:100%" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>';

const FIELD_STYLE = "height:32px;box-shadow:inset 0 0 0 1px currentColor;opacity:.25";
const SKELETON_STYLE = "width:12rem;height:1rem";
const SEPARATOR_STYLE = "width:12rem";
const SAMPLE_ICON = "sample";

const slot = (look: StyleVariant, name: string): string =>
  look.slots.find((entry) => entry.slot === name)?.classes ?? "";

const prop = (look: StyleVariant, name: string): string | null =>
  look.props.find((entry) => entry.name === name)?.value ?? null;

const flag = (look: StyleVariant, name: string): boolean => prop(look, name) === "true";

const leadingIcon = (look: StyleVariant): string =>
  flag(look, "leading") ? `<span class="${slot(look, "leadingIcon")}">${ICON}</span>` : "";

/** Nuxt UI's six button variants collapse into three roles. */
const BUTTON_ROLES: ReadonlyMap<string, ButtonVariant> = new Map([
  ["ghost", "tertiary"],
  ["link", "tertiary"],
  ["outline", "secondary"],
  ["soft", "secondary"],
  ["solid", "primary"],
  ["subtle", "secondary"],
]);

/** Dense by default: xs and sm become `sm`, md and lg become `md`. */
const BUTTON_SIZES: ReadonlyMap<string, ButtonSize> = new Map([
  ["lg", "md"],
  ["md", "md"],
  ["sm", "sm"],
  ["xs", "sm"],
]);

const BADGE_STATUSES: ReadonlyMap<string, BadgeColor> = new Map([
  ["error", "danger"],
  ["neutral", "neutral"],
  ["primary", "info"],
  ["success", "success"],
  ["warning", "warning"],
]);

const when = (condition: boolean, entry: MigratedProp): MigratedProp[] =>
  condition ? [entry] : [];

const migrateButton = (look: StyleVariant): MigratedProps => {
  const size = BUTTON_SIZES.get(prop(look, "size") ?? "md") ?? "md";

  return [
    ["variant", BUTTON_ROLES.get(prop(look, "variant") ?? "solid") ?? "primary"],
    ...when(size !== "md", ["size", size]),
    ...when(prop(look, "color") === "error", ["danger", true]),
    ...when(flag(look, "block"), ["block", true]),
    ...when(flag(look, "leading"), ["icon", SAMPLE_ICON]),
    ...when(!flag(look, "square"), ["label", "Save"]),
  ];
};

const migrateBadge = (look: StyleVariant): MigratedProps => {
  const color = BADGE_STATUSES.get(prop(look, "color") ?? "primary") ?? "neutral";

  return [...when(color !== "neutral", ["color", color]), ["label", "Live"]];
};

const migrateField = (look: StyleVariant): MigratedProps => {
  const type = prop(look, "type");

  return [
    ...when(type !== null, ["type", type ?? "text"]),
    ...when(flag(look, "leading"), ["icon", SAMPLE_ICON]),
    ["placeholder", "Search players"],
  ];
};

export const PARITY_CASES: readonly ParityCase[] = [
  {
    migrate: migrateButton,
    name: "Button",
    nuxtUi: "UButton",
    reference: (look) =>
      `<button type="button" class="${slot(look, "base")}">${leadingIcon(look)}${
        flag(look, "square") ? "" : `<span class="${slot(look, "label")}">Save</span>`
      }</button>`,
    render: (props) => h(Button, Object.fromEntries(props)),
  },
  {
    migrate: migrateBadge,
    name: "Badge",
    nuxtUi: "UBadge",
    reference: (look) =>
      `<span class="${slot(look, "base")}">${leadingIcon(look)}<span class="${slot(look, "label")}">Live</span></span>`,
    render: (props) => h(Badge, Object.fromEntries(props)),
  },
  {
    migrate: migrateField,
    name: "Input",
    nuxtUi: "UInput",
    reference: (look) =>
      `<div class="${slot(look, "root")}"><input class="${slot(look, "base")}" type="${
        prop(look, "type") ?? "text"
      }" placeholder="Search players">${
        flag(look, "leading")
          ? `<span class="${slot(look, "leading")}"><span class="${slot(look, "leadingIcon")}">${ICON}</span></span>`
          : ""
      }</div>`,
    render: (props) => h(Input, Object.fromEntries(props)),
  },
  {
    migrate: (look) => [
      ...when(flag(look, "autoresize"), ["autoresize", true]),
      ["placeholder", "Write a note"],
    ],
    name: "Textarea",
    nuxtUi: "UTextarea",
    reference: (look) =>
      `<div class="${slot(look, "root")}"><textarea class="${slot(look, "base")}" rows="3" placeholder="Write a note"></textarea></div>`,
    render: (props) => h(Textarea, Object.fromEntries(props)),
  },
  {
    migrate: (look) => [["label", "Handle"], ...when(flag(look, "required"), ["required", true])],
    name: "FormField",
    nuxtUi: "UFormField",
    reference: (look) =>
      `<div class="${slot(look, "root")}"><div class="${slot(look, "wrapper")}"><div class="${slot(
        look,
        "labelWrapper",
      )}"><label class="${slot(look, "label")}">Handle</label></div></div><div class="${slot(
        look,
        "container",
      )}" style="margin-top:0.25rem"><div style="${FIELD_STYLE}"></div></div></div>`,
    render: (props) =>
      h(FormField, Object.fromEntries(props), () => h("div", { style: FIELD_STYLE })),
  },
  {
    migrate: () => [],
    name: "Skeleton",
    nuxtUi: "USkeleton",
    reference: (look) => `<div class="${slot(look, "base")}" style="${SKELETON_STYLE}"></div>`,
    render: () => h(Skeleton, { style: SKELETON_STYLE }),
  },
  {
    migrate: (look) => when(prop(look, "size") === "sm", ["size", "sm"]),
    name: "Kbd",
    nuxtUi: "UKbd",
    reference: (look) => `<kbd class="${slot(look, "base")}">K</kbd>`,
    render: (props) => h(Kbd, Object.fromEntries(props), () => "K"),
  },
  {
    migrate: () => [],
    name: "Separator",
    nuxtUi: "USeparator",
    reference: (look) =>
      `<div style="${SEPARATOR_STYLE}"><div class="${slot(look, "root")}" role="separator"><div class="${slot(
        look,
        "border",
      )}" style="width:100%;border-top-width:1px"></div></div></div>`,
    render: () => h("div", { style: SEPARATOR_STYLE }, [h(Separator)]),
  },
];
