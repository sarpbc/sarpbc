import {
  Avatar,
  BADGE_COLORS,
  Badge,
  Breadcrumb,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  Button,
  Checkbox,
  CommandPalette,
  DropdownMenu,
  FormField,
  HoverCard,
  Input,
  InputNumber,
  Kbd,
  Link,
  LINK_VARIANTS,
  Modal,
  NavigationMenu,
  Pagination,
  Popover,
  Separator,
  Skeleton,
  Slideover,
  Spinner,
  Switch,
  Tabs,
  Textarea,
  Toaster,
  Tooltip,
  useToast,
} from "@sarpbc/design";
import { defineComponent, h, ref } from "vue";

import ComboboxDemo from "./demos/ComboboxDemo.vue";
import RadioDemo from "./demos/RadioDemo.vue";
import SelectDemo from "./demos/SelectDemo.vue";
import TableDemo from "./demos/TableDemo.vue";
import { TEAMS } from "./teams.ts";

import type { Component, VNode } from "vue";

/*
 * One playground per library component. Select options come from the
 * library's closed unions, so a playground can only express what the API
 * allows. `icon` controls toggle the catalog's sample icon.
 */
export type Control =
  | { initial: boolean; kind: "boolean"; name: string }
  | { initial: boolean; kind: "icon"; name: string }
  | { initial: string; kind: "select"; name: string; options: readonly string[] }
  | { initial: string; kind: "text"; name: string };

export type PlaygroundProp = readonly [name: string, value: string | boolean];

export type PlaygroundProps = readonly PlaygroundProp[];

export interface Playground {
  controls: readonly Control[];
  render: (props: PlaygroundProps) => VNode;
}

export const SAMPLE_ICON = "sample";

const of = (props: PlaygroundProps) => Object.fromEntries(props);

/** A playground without controls: the component in a typical use. */
const demo = (render: () => VNode): Playground => ({ controls: [], render });

/* Stateful demos keep their value between renders. */
const stateful = (setup: () => () => VNode): Component => defineComponent({ setup });

const InputNumberDemo = stateful(() => {
  const value = ref<number | null>(3);

  return () =>
    h(InputNumber, {
      max: 9,
      min: 1,
      modelValue: value.value,
      "onUpdate:modelValue": (next: number | null) => {
        value.value = next;
      },
      style: "width:8rem",
    });
});

const TabsDemo = stateful(() => {
  const value = ref("info");

  return () =>
    h(Tabs, {
      ariaLabel: "Team",
      items: [
        { label: "Info", value: "info" },
        { label: "Matches", value: "matches" },
        { label: "Earnings", value: "earnings" },
      ],
      modelValue: value.value,
      "onUpdate:modelValue": (next: string) => {
        value.value = next;
      },
    });
});

const PaginationDemo = stateful(() => {
  const page = ref(4);

  return () =>
    h(Pagination, {
      itemsPerPage: 20,
      "onUpdate:page": (next: number) => {
        page.value = next;
      },
      page: page.value,
      total: 400,
    });
});

const CommandDemo = stateful(() => {
  const search = ref("");

  return () =>
    h("div", { style: "width:28rem;height:16rem;box-shadow:inset 0 0 0 1px var(--sb-border)" }, [
      h(CommandPalette, {
        empty: "No result",
        groups: [
          {
            id: "teams",
            items: TEAMS.map((option) => ({
              icon: SAMPLE_ICON,
              id: option.value,
              label: option.label,
              onSelect: () => null,
              suffix: "France",
            })),
            label: "Teams",
          },
        ],
        "onUpdate:searchTerm": (next: string) => {
          search.value = next;
        },
        placeholder: "Search teams",
        searchTerm: search.value,
      }),
    ]);
});

const ToastDemo = stateful(() => {
  const toast = useToast();

  return () =>
    h(Toaster, null, () =>
      h(Button, {
        label: "Show a toast",
        onClick: () => {
          toast.add({ color: "success", description: "The roster was saved.", title: "Saved" });
        },
        variant: "secondary",
      }),
    );
});

export const PLAYGROUNDS: ReadonlyMap<string, Playground> = new Map<string, Playground>([
  [
    "Avatar",
    {
      controls: [
        { initial: "sm", kind: "select", name: "size", options: ["xs", "sm", "lg"] },
        { initial: "Karmine Corp", kind: "text", name: "alt" },
      ],
      render: (props) => h(Avatar, { alt: "Karmine Corp", ...of(props) }),
    },
  ],
  [
    "Badge",
    {
      controls: [
        { initial: "neutral", kind: "select", name: "color", options: BADGE_COLORS },
        { initial: "Live", kind: "text", name: "label" },
        { initial: false, kind: "icon", name: "icon" },
      ],
      render: (props) => h(Badge, of(props)),
    },
  ],
  [
    "Breadcrumb",
    demo(() =>
      h(Breadcrumb, {
        items: [{ label: "Tournaments", to: "#/Breadcrumb" }, { label: "RLCS 2026" }],
      }),
    ),
  ],
  [
    "Button",
    {
      controls: [
        { initial: "primary", kind: "select", name: "variant", options: BUTTON_VARIANTS },
        { initial: "md", kind: "select", name: "size", options: BUTTON_SIZES },
        { initial: "Save", kind: "text", name: "label" },
        { initial: false, kind: "boolean", name: "danger" },
        { initial: false, kind: "icon", name: "icon" },
        { initial: false, kind: "icon", name: "trailingIcon" },
        { initial: false, kind: "boolean", name: "loading" },
        { initial: false, kind: "boolean", name: "disabled" },
        { initial: false, kind: "boolean", name: "block" },
      ],
      render: (props) => h(Button, of(props)),
    },
  ],
  [
    "Checkbox",
    {
      controls: [
        { initial: "Show spoilers", kind: "text", name: "label" },
        { initial: false, kind: "boolean", name: "disabled" },
      ],
      render: (props) => h(Checkbox, of(props)),
    },
  ],
  ["Combobox", demo(() => h(ComboboxDemo))],
  ["CommandPalette", demo(() => h(CommandDemo))],
  [
    "DropdownMenu",
    demo(() =>
      h(
        DropdownMenu,
        {
          items: [
            [
              { icon: SAMPLE_ICON, label: "Rename", onSelect: () => null },
              { label: "Unpublish", onSelect: () => null },
            ],
            [{ danger: true, label: "Delete", onSelect: () => null }],
          ],
        },
        () => h(Button, { label: "Actions", variant: "secondary" }),
      ),
    ),
  ],
  [
    "FormField",
    {
      controls: [
        { initial: "Handle", kind: "text", name: "label" },
        { initial: "", kind: "text", name: "hint" },
        { initial: "", kind: "text", name: "description" },
        { initial: "", kind: "text", name: "help" },
        { initial: "", kind: "text", name: "error" },
        { initial: false, kind: "boolean", name: "required" },
      ],
      render: (props) => h(FormField, of(props), () => h(Input, { placeholder: "Search players" })),
    },
  ],
  [
    "HoverCard",
    demo(() =>
      h(HoverCard, null, {
        content: () => h("p", { style: "margin:0;padding:0.75rem" }, "Karmine Corp · EU"),
        default: () => h(Link, { to: "#/HoverCard", variant: "accent" }, () => "Karmine Corp"),
      }),
    ),
  ],
  [
    "Input",
    {
      controls: [
        { initial: "Search players", kind: "text", name: "placeholder" },
        {
          initial: "text",
          kind: "select",
          name: "type",
          options: ["text", "email", "password", "search", "url", "tel", "date"],
        },
        { initial: false, kind: "icon", name: "icon" },
        { initial: false, kind: "icon", name: "trailingIcon" },
        { initial: false, kind: "boolean", name: "loading" },
        { initial: false, kind: "boolean", name: "disabled" },
      ],
      render: (props) => h(Input, of(props)),
    },
  ],
  ["InputNumber", demo(() => h(InputNumberDemo))],
  [
    "Kbd",
    {
      controls: [
        { initial: "md", kind: "select", name: "size", options: ["sm", "md"] },
        { initial: "meta", kind: "text", name: "value" },
      ],
      render: (props) => h(Kbd, of(props)),
    },
  ],
  [
    "Link",
    {
      controls: [{ initial: "muted", kind: "select", name: "variant", options: LINK_VARIANTS }],
      render: (props) => h(Link, { to: "#/Link", ...of(props) }, () => "View the bracket"),
    },
  ],
  [
    "Modal",
    {
      controls: [
        { initial: "Rename the article", kind: "text", name: "title" },
        { initial: "md", kind: "select", name: "size", options: ["md", "lg", "xl", "2xl"] },
      ],
      render: (props) =>
        h(
          Modal,
          { title: "Rename the article", ...of(props) },
          {
            body: () => h(FormField, { label: "Title" }, () => h(Input, {})),
            default: () => h(Button, { label: "Open", variant: "secondary" }),
            footer: () => h(Button, { label: "Save" }),
          },
        ),
    },
  ],
  [
    "NavigationMenu",
    demo(() =>
      h(NavigationMenu, {
        items: [
          { active: true, label: "News", to: "#/NavigationMenu" },
          { label: "Matches", to: "#/NavigationMenu" },
          { label: "Tournaments", to: "#/NavigationMenu" },
        ],
      }),
    ),
  ],
  ["Pagination", demo(() => h(PaginationDemo))],
  [
    "Popover",
    demo(() =>
      h(Popover, null, {
        content: () => h("p", { style: "margin:0;padding:0.75rem" }, "Popover content"),
        default: () => h(Button, { label: "Open", variant: "secondary" }),
      }),
    ),
  ],
  ["RadioGroup", demo(() => h(RadioDemo))],
  ["Select", demo(() => h(SelectDemo))],
  [
    "Separator",
    {
      controls: [
        {
          initial: "horizontal",
          kind: "select",
          name: "orientation",
          options: ["horizontal", "vertical"],
        },
        { initial: "", kind: "text", name: "label" },
      ],
      render: (props) =>
        h("div", { style: "display:flex;align-items:center;width:12rem;height:2rem" }, [
          h(Separator, of(props)),
        ]),
    },
  ],
  ["Skeleton", demo(() => h(Skeleton, { style: "width:12rem;height:1rem" }))],
  [
    "Slideover",
    demo(() =>
      h(
        Slideover,
        { side: "left", title: "Menu" },
        {
          body: () => h("p", { style: "margin:0" }, "Navigation"),
          default: () => h(Button, { label: "Open", variant: "secondary" }),
        },
      ),
    ),
  ],
  ["Spinner", demo(() => h(Spinner, { style: "width:1.25rem;height:1.25rem" }))],
  [
    "Switch",
    {
      controls: [
        { initial: "Spoilers", kind: "text", name: "label" },
        { initial: "", kind: "text", name: "description" },
        { initial: false, kind: "boolean", name: "disabled" },
      ],
      render: (props) => h(Switch, of(props)),
    },
  ],
  ["Table", demo(() => h(TableDemo))],
  ["Tabs", demo(() => h(TabsDemo))],
  [
    "Textarea",
    {
      controls: [
        { initial: "Write a note", kind: "text", name: "placeholder" },
        { initial: false, kind: "boolean", name: "autoresize" },
        { initial: false, kind: "boolean", name: "disabled" },
      ],
      render: (props) => h(Textarea, of(props)),
    },
  ],
  ["Toaster", demo(() => h(ToastDemo))],
  [
    "Tooltip",
    {
      controls: [
        { initial: "Copy the link", kind: "text", name: "text" },
        {
          initial: "top",
          kind: "select",
          name: "side",
          options: ["top", "right", "bottom", "left"],
        },
      ],
      render: (props) =>
        h(Tooltip, { text: "Copy the link", ...of(props) }, () =>
          h(Button, { "aria-label": "Copy", icon: SAMPLE_ICON, variant: "tertiary" }),
        ),
    },
  ],
]);
