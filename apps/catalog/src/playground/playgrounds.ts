import {
  ActionList,
  Avatar,
  BADGE_COLORS,
  Badge,
  Breadcrumb,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  Button,
  Checkbox,
  Combobox,
  CommandPalette,
  DropdownMenu,
  EmptyState,
  ErrorState,
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
  Radio,
  RadioGroup,
  Select,
  Separator,
  Skeleton,
  Slideover,
  Spinner,
  Switch,
  Table,
  Tabs,
  Textarea,
  Toaster,
  Tooltip,
  useToast,
} from "@sarpbc/design";
import { defineComponent, h, ref } from "vue";
import { z } from "zod";

import {
  OVERLAY_ALIGNS,
  OVERLAY_SIDES,
  SAMPLE_ICON,
  SAMPLE_IMAGE,
  choice,
  demo,
  flag,
  icon,
  number,
  required,
  text,
} from "./model.ts";
import { TEAMS } from "./teams.ts";

import type { Bindings, Playground, VariantState } from "./model.ts";
import type { Component } from "vue";

import type {
  ActionItem,
  BreadcrumbItem,
  NavigationItem,
  SelectValue,
  TableSort,
  TableColumn,
  ToastMessage,
} from "@sarpbc/design";

const selectValue = z.union([z.string(), z.number()]);

const tableSort = z.object({ desc: z.boolean(), id: z.string() });

const state = (label: string, values: VariantState["values"] = {}): VariantState => ({
  label,
  values,
});

const OVERLAY_TRIGGER = () => h(Button, { label: "Open", variant: "secondary" });

const card = (content: string) =>
  h("p", { style: "margin:0;padding:0.75rem;max-width:16rem" }, content);

/* A RadioGroup owning its value, so the Radio playground tunes a single radio. */
const RadioSample = defineComponent(
  (props: { radio: Bindings }) => {
    const value = ref<SelectValue | null>("striker");

    return () =>
      h(
        RadioGroup,
        {
          modelValue: value.value,
          "onUpdate:modelValue": (next: SelectValue | null) => {
            value.value = next;
          },
          style: "width:20rem",
        },
        () => [
          h(Radio, {
            description: "Sets the pace and takes the first touch.",
            label: "Striker",
            value: "striker",
          }),
          h(Radio, { ...props.radio, value: "playmaker" }),
        ],
      );
  },
  { props: ["radio"] },
);

const ToastTrigger = defineComponent(
  (props: { message: ToastMessage }) => {
    const toast = useToast();

    return () =>
      h(Button, {
        label: props.message.color,
        onClick: () => {
          toast.add(props.message);
        },
        variant: "secondary",
      });
  },
  { props: ["message"] },
);

interface TeamRow {
  name: string;
  region: string;
  titles: number;
}

const TEAM_ROWS: TeamRow[] = [
  { name: "Karmine Corp", region: "EU", titles: 4 },
  { name: "Team Vitality", region: "EU", titles: 6 },
  { name: "Gentle Mates", region: "EU", titles: 1 },
  { name: "Team BDS", region: "EU", titles: 5 },
  { name: "Falcons", region: "MENA", titles: 3 },
];

const TEAM_COLUMNS: TableColumn<TeamRow>[] = [
  { accessorKey: "name", header: "Team", meta: { rowHeader: true } },
  { accessorKey: "region", enableSorting: false, header: "Region" },
  { accessorKey: "titles", header: "Titles", meta: { align: "end" }, sortDescFirst: true },
];

/* The table only reports the sort; the page orders its own data. */
const sortRows = (rows: TeamRow[], sort: TableSort | undefined): TeamRow[] =>
  sort === undefined
    ? rows
    : rows.toSorted((a, b) => {
        const order = sort.id === "titles" ? a.titles - b.titles : a.name.localeCompare(b.name);

        return sort.desc ? -order : order;
      });

const BREADCRUMB: BreadcrumbItem[] = [
  { label: "Tournaments", to: "#/Breadcrumb" },
  { label: "RLCS 2026", to: "#/Breadcrumb" },
  { label: "World Championship", to: "#/Breadcrumb" },
  { label: "Grand final" },
];

const NAVIGATION: NavigationItem[] = [
  { active: true, label: "News", to: "#/NavigationMenu" },
  { label: "Matches", to: "#/NavigationMenu" },
  { label: "Tournaments", to: "#/NavigationMenu" },
  { label: "Forum", target: "_blank", to: "#/NavigationMenu" },
];

const CAREER_ACTIONS = [
  { description: "Your contract starts today.", label: "Sign with the new team", value: "sign" },
  { description: "One more season with your team.", label: "Extend the contract", value: "extend" },
  { description: "Play elsewhere until the summer.", label: "Go on loan", value: "loan" },
  { description: "Your career ends here.", label: "Retire", value: "retire" },
];

const TOASTS: readonly ToastMessage[] = [
  { color: "success", description: "The roster was saved.", title: "Saved" },
  { color: "info", description: "The bracket updates every minute.", title: "Live sync on" },
  { color: "warning", description: "Two games have no score yet.", title: "Incomplete series" },
  { color: "danger", description: "Check your connection and try again.", title: "Not saved" },
];

const ROLES = [
  { description: "Sets the pace and takes the first touch.", label: "Striker", value: "striker" },
  { description: "Reads the play and covers rotations.", label: "Playmaker", value: "playmaker" },
  { description: "Stays back and saves.", disabled: true, label: "Keeper", value: "keeper" },
];

const TEAM_GROUPS = [
  { label: "Europe", options: TEAMS },
  {
    label: "North America",
    options: [
      { label: "G2 Stride", value: "g2" },
      { label: "Spacestation", value: "ssg" },
    ],
  },
];

export const PLAYGROUNDS: ReadonlyMap<string, Playground> = new Map<string, Playground>([
  [
    "ActionList",
    {
      category: "Data",
      controls: [
        demo(number("actions", 3, { max: CAREER_ACTIONS.length, min: 1 })),
        demo(flag("descriptions", true)),
        demo(flag("danger", true)),
      ],
      description:
        "A short list of actions where choosing a row acts at once, as in a confirmation step. A danger row tints its description for actions that cannot be undone.",
      events: ["select"],
      render: (bindings, sample) => {
        const count = z.number().catch(3).parse(sample.actions);

        const items: ActionItem[] = CAREER_ACTIONS.slice(-count).map((action) => ({
          danger: action.value === "retire" && sample.danger === true,
          description: sample.descriptions === true ? action.description : undefined,
          label: action.label,
          value: action.value,
        }));

        return h(ActionList, { ...bindings, items, style: "width:20rem" });
      },
    },
  ],
  [
    "Avatar",
    {
      category: "Element",
      controls: [
        required(text("alt", "Karmine Corp")),
        choice("size", ["xs", "sm", "lg"], "sm"),
        { initial: false, kind: "toggle", name: "src", value: SAMPLE_IMAGE },
        icon("icon"),
      ],
      description:
        "A person or a team. It shows the image, then the icon, then the initials of `alt`, so it never renders empty. xs sits in navigation rows, sm in lists and lg on a profile header.",
      render: (bindings) => h(Avatar, { alt: "", ...bindings }),
      variants: {
        columns: [state("initials"), state("icon", { icon: true }), state("image", { src: true })],
        rows: "size",
      },
    },
  ],
  [
    "Badge",
    {
      category: "Element",
      controls: [choice("color", BADGE_COLORS, "neutral"), text("label", "Live"), icon("icon")],
      description:
        "A status attached to an item, such as Live or Forfeit. The color states what the status means, never decoration.",
      render: (bindings) => h(Badge, bindings),
      variants: {
        columns: [
          state("label"),
          state("icon", { icon: true }),
          state("icon only", { icon: true, label: "" }),
        ],
        rows: "color",
      },
    },
  ],
  [
    "Breadcrumb",
    {
      category: "Navigation",
      controls: [demo(number("depth", 2, { max: 4, min: 1 }))],
      description:
        "The path from the root to the current page. The last item is the current page and is not a link; a level without a page of its own has no `to`.",
      render: (_bindings, sample) => {
        const depth = z.number().catch(2).parse(sample.depth);

        return h(Breadcrumb, { items: BREADCRUMB.slice(BREADCRUMB.length - depth) });
      },
    },
  ],
  [
    "Button",
    {
      category: "Element",
      controls: [
        choice("variant", BUTTON_VARIANTS, "primary"),
        choice("size", BUTTON_SIZES, "md"),
        text("label", "Save"),
        flag("danger"),
        icon("icon"),
        icon("trailingIcon"),
        flag("loading"),
        flag("disabled"),
        flag("block"),
        text("to"),
      ],
      description:
        "Starts an action, or navigates when `to` is set. Danger is the only color change a button allows; loading keeps its width and blocks clicks.",
      events: ["click"],
      render: (bindings) => h(Button, bindings),
      variants: {
        columns: [
          state("default"),
          state("icon", { icon: true }),
          state("danger", { danger: true }),
          state("loading", { loading: true }),
          state("disabled", { disabled: true }),
        ],
        rows: "variant",
      },
    },
  ],
  [
    "Checkbox",
    {
      category: "Form",
      controls: [text("label", "Show spoilers"), flag("disabled")],
      description: "An independent yes or no choice that applies once the form is saved.",
      models: { modelValue: false },
      render: (bindings) => h(Checkbox, bindings),
      variants: {
        rows: [
          state("off", {}),
          state("disabled", { disabled: true }),
          state("no label", { label: "" }),
        ],
      },
    },
  ],
  [
    "Combobox",
    {
      category: "Form",
      controls: [
        text("placeholder", "Search a team"),
        icon("icon"),
        flag("multiple"),
        flag("loading"),
        flag("disabled"),
      ],
      description:
        "A select the user can type into to filter a long list. With `multiple` the value is an array; with `remote` the items already match `searchTerm`, fetched from the server.",
      models: { modelValue: null, searchTerm: "" },
      render: ({ modelValue, ...bindings }) => {
        const value =
          bindings.multiple === true
            ? z.array(selectValue).catch([]).parse(modelValue)
            : selectValue.nullable().catch(null).parse(modelValue);

        return h(Combobox, { ...bindings, items: TEAMS, modelValue: value, style: "width:16rem" });
      },
    },
  ],
  [
    "CommandPalette",
    {
      category: "Navigation",
      controls: [
        required(text("placeholder", "Search teams")),
        required(text("empty", "No result")),
        flag("loading"),
        demo(flag("images")),
      ],
      description:
        "A search box over grouped results and actions, used in the site search. Groups marked `remote` hold server results and are not filtered again.",
      models: { searchTerm: "" },
      render: (bindings, sample) =>
        h(
          "div",
          { style: "width:28rem;height:16rem;box-shadow:inset 0 0 0 1px var(--sb-border)" },
          [
            h(CommandPalette, {
              empty: "",
              groups: [
                {
                  id: "teams",
                  items: TEAMS.map((option) => ({
                    icon: SAMPLE_ICON,
                    id: option.value,
                    image: sample.images === true ? SAMPLE_IMAGE : undefined,
                    label: option.label,
                    onSelect: () => null,
                    suffix: "France",
                  })),
                  label: "Teams",
                },
              ],
              placeholder: "",
              ...bindings,
            }),
          ],
        ),
    },
  ],
  [
    "DropdownMenu",
    {
      category: "Overlay",
      controls: [
        choice("align", OVERLAY_ALIGNS, "start"),
        demo(flag("icons", true)),
        demo(flag("disabled item")),
      ],
      description:
        "Secondary actions behind a trigger, in groups split by separators. A danger item ends or deletes something.",
      render: (bindings, sample) =>
        h(
          DropdownMenu,
          {
            ...bindings,
            items: [
              [
                {
                  icon: sample.icons === true ? SAMPLE_ICON : undefined,
                  label: "Rename",
                  onSelect: () => null,
                },
                {
                  disabled: sample["disabled item"] === true,
                  icon: sample.icons === true ? SAMPLE_ICON : undefined,
                  label: "Unpublish",
                  onSelect: () => null,
                },
              ],
              [{ danger: true, label: "Delete", onSelect: () => null }],
            ],
          },
          () => h(Button, { label: "Actions", variant: "secondary" }),
        ),
    },
  ],
  [
    "EmptyState",
    {
      category: "Feedback",
      controls: [
        required(text("title", "No transfer this week")),
        text("hint", "Transfers appear here once a team announces them."),
        demo(flag("action")),
      ],
      description:
        "Stands in for a list or a section with nothing to show. The hint says why; the default slot holds the actions that lead out, such as clearing a filter.",
      render: (bindings, sample) =>
        h(EmptyState, { icon: SAMPLE_ICON, title: "", ...bindings }, () =>
          sample.action === true
            ? [h(Button, { label: "Clear the filters", variant: "secondary" })]
            : [],
        ),
    },
  ],
  [
    "ErrorState",
    {
      category: "Feedback",
      controls: [required(text("message", "The matches could not be loaded."))],
      description:
        "Replaces a section whose data failed to load, with a retry button. The page shows it in place of the content, not as a toast.",
      events: ["retry"],
      render: (bindings) => h(ErrorState, { message: "", ...bindings }),
    },
  ],
  [
    "FormField",
    {
      category: "Form",
      controls: [
        text("label", "Handle"),
        text("hint"),
        text("description"),
        text("help"),
        text("error"),
        flag("required"),
      ],
      description:
        "Labels a control and carries its hint, description, help and error. An error replaces the help and marks the control invalid.",
      render: (bindings) =>
        h(FormField, bindings, () => h(Input, { placeholder: "Search players" })),
      variants: {
        rows: [
          state("label"),
          state("description", { description: "Shown on your profile." }),
          state("help", { help: "Letters and digits only." }),
          state("error", { error: "This handle is taken." }),
          state("required", { required: true }),
        ],
      },
    },
  ],
  [
    "HoverCard",
    {
      category: "Overlay",
      controls: [
        choice("side", OVERLAY_SIDES, "bottom"),
        choice("align", OVERLAY_ALIGNS, "center"),
      ],
      description:
        "A preview that opens while the pointer rests on a link, such as a team card over its name. Its content is extra; the link must work without it.",
      models: { open: false },
      render: (bindings) =>
        h(HoverCard, bindings, {
          content: () => card("Karmine Corp · EU · 4 titles"),
          default: () => h(Link, { to: "#/HoverCard", variant: "primary" }, () => "Karmine Corp"),
        }),
    },
  ],
  [
    "Input",
    {
      category: "Form",
      controls: [
        text("placeholder", "Search players"),
        choice(
          "type",
          ["text", "email", "password", "search", "url", "tel", "date", "datetime-local"],
          "text",
        ),
        icon("icon"),
        icon("trailingIcon"),
        flag("loading"),
        flag("disabled"),
      ],
      description:
        "A single-line text field. Loading replaces the leading icon with a spinner, for a search running as the user types.",
      models: { modelValue: "" },
      render: (bindings) => h(Input, { ...bindings, style: "width:16rem" }),
      variants: {
        rows: [
          state("default"),
          state("icon", { icon: true }),
          state("trailing icon", { trailingIcon: true }),
          state("loading", { icon: true, loading: true }),
          state("disabled", { disabled: true }),
        ],
      },
    },
  ],
  [
    "InputNumber",
    {
      category: "Form",
      controls: [
        number("min", null),
        number("max", null),
        number("step", 1, { min: 1 }),
        flag("grouping", true),
        flag("disabled"),
      ],
      description:
        "A number field with stepper buttons, clamped to `min` and `max`. Turn `grouping` off for years and identifiers, which take no thousands separator.",
      models: { modelValue: 3 },
      render: (bindings) => h(InputNumber, { ...bindings, style: "width:9rem" }),
    },
  ],
  [
    "Kbd",
    {
      category: "Element",
      controls: [choice("size", ["sm", "md"], "md"), text("value", "meta")],
      description:
        "A keyboard key in a shortcut hint. Key names such as `meta`, `enter` or `escape` render as the platform's symbol.",
      render: (bindings) => h(Kbd, bindings),
      variants: {
        columns: [
          state("meta", { value: "meta" }),
          state("enter", { value: "enter" }),
          state("escape", { value: "escape" }),
          state("K", { value: "K" }),
        ],
        rows: "size",
      },
    },
  ],
  [
    "Link",
    {
      category: "Navigation",
      controls: [
        choice("variant", LINK_VARIANTS, "primary"),
        required(text("to", "#/Link")),
        demo(text("text", "View the bracket")),
      ],
      description:
        "Navigation in lists, tables and copy. primary for every link by default (navigation, names, meta); secondary for a link inside running text, with a dashed underline. Both share the muted text color. NavigationMenu items share these styles.",
      render: (bindings, sample) =>
        h(Link, { to: "", ...bindings }, () => z.string().catch("Link").parse(sample.text)),
      variants: { rows: "variant" },
    },
  ],
  [
    "Modal",
    {
      category: "Overlay",
      controls: [
        required(text("title", "Rename the article")),
        text("description"),
        choice("size", ["md", "lg", "xl", "2xl"], "md"),
        flag("dismissible", true),
      ],
      description:
        "A dialog that blocks the page for one focused task. Turn `dismissible` off while saving so outside clicks and Escape keep it open.",
      models: { open: false },
      render: (bindings) =>
        h(
          Modal,
          { title: "", ...bindings },
          {
            body: () => h(FormField, { label: "Title" }, () => h(Input, {})),
            default: OVERLAY_TRIGGER,
            footer: () => h(Button, { label: "Save" }),
          },
        ),
    },
  ],
  [
    "NavigationMenu",
    {
      category: "Navigation",
      controls: [
        choice("orientation", ["horizontal", "vertical"], "horizontal"),
        demo(flag("icons")),
      ],
      description:
        "The site's main navigation. Horizontal is a header bar of text links; vertical is a sidebar of rows with icons.",
      render: (bindings, sample) =>
        h(NavigationMenu, {
          ...bindings,
          items: NAVIGATION.map((item) =>
            sample.icons === true ? { ...item, icon: SAMPLE_ICON } : item,
          ),
          style: bindings.orientation === "vertical" ? "width:14rem" : undefined,
        }),
      variants: { rows: "orientation" },
    },
  ],
  [
    "Pagination",
    {
      category: "Navigation",
      controls: [
        required(number("itemsPerPage", 20, { min: 1 })),
        required(number("total", 400, { min: 0 })),
      ],
      description:
        "Moves between the pages of a long list. It hides itself when everything fits on one page.",
      models: { page: 4 },
      render: (bindings) => h(Pagination, { itemsPerPage: 1, page: 1, total: 0, ...bindings }),
    },
  ],
  [
    "Popover",
    {
      category: "Overlay",
      controls: [
        choice("side", OVERLAY_SIDES, "bottom"),
        choice("align", OVERLAY_ALIGNS, "center"),
        flag("dismissible", true),
      ],
      description:
        "Content anchored to a trigger, such as filters or a short form. Turn `dismissible` off when the owner must close it.",
      models: { open: false },
      render: (bindings) =>
        h(Popover, bindings, {
          content: () => card("Popover content"),
          default: OVERLAY_TRIGGER,
        }),
    },
  ],
  [
    "Radio",
    {
      category: "Form",
      controls: [
        text("label", "Playmaker"),
        text("description", "Reads the play and covers rotations."),
        choice("status", ["none", "success", "danger"], "none"),
        flag("disabled"),
      ],
      description:
        "One choice inside a RadioGroup, for layouts the group's `items` cannot express. Once a prediction is settled, `status` tints the chosen option as right or wrong.",
      render: (bindings) => h(RadioSample, { radio: bindings }),
    },
  ],
  [
    "RadioGroup",
    {
      category: "Form",
      controls: [
        choice("orientation", ["vertical", "horizontal"], "vertical"),
        flag("disabled"),
        demo(flag("descriptions")),
      ],
      description:
        "One choice among a few visible options: plain labels, the chosen one on a neutral background. With descriptions, each option spans the full width. Switching views of the same content is STabs.",
      models: { modelValue: "striker" },
      render: (bindings, sample) =>
        h(RadioGroup, {
          ...bindings,
          items:
            sample.descriptions === true
              ? ROLES
              : ROLES.map(({ description: _description, ...role }) => role),
        }),
      variants: { rows: "orientation" },
    },
  ],
  [
    "Select",
    {
      category: "Form",
      controls: [
        text("placeholder", "Choose a team"),
        flag("loading"),
        flag("disabled"),
        demo(flag("groups")),
      ],
      description:
        "One choice from a list too long for radios. Once chosen, a select never goes back to empty; use a Combobox when the user needs to type.",
      models: { modelValue: null },
      render: (bindings, sample) =>
        h(Select, {
          ...bindings,
          ...(sample.groups === true ? { groups: TEAM_GROUPS } : { items: TEAMS }),
          style: "width:16rem",
        }),
    },
  ],
  [
    "Separator",
    {
      category: "Element",
      controls: [choice("orientation", ["horizontal", "vertical"], "horizontal"), text("label")],
      description:
        "Divides content. It can carry a centered label, such as “or” between two sign-in options.",
      render: (bindings) =>
        h(
          "div",
          {
            style: `display:flex;align-items:center;justify-content:center;width:16rem;height:${
              bindings.orientation === "vertical" ? "8rem" : "3rem"
            }`,
          },
          [h(Separator, bindings)],
        ),
    },
  ],
  [
    "Skeleton",
    {
      category: "Feedback",
      controls: [
        demo(number("width", 12, { min: 1 })),
        demo(number("height", 1, { min: 1 })),
        demo(flag("round")),
      ],
      description:
        "A pulsing placeholder in the shape of content that is loading. The caller sizes it to match what replaces it.",
      render: (_bindings, sample) =>
        h(Skeleton, {
          style: {
            borderRadius: sample.round === true ? "9999px" : undefined,
            height: `${String(sample.height ?? 1)}rem`,
            width: `${String(sample.width ?? 12)}rem`,
          },
        }),
    },
  ],
  [
    "Slideover",
    {
      category: "Overlay",
      controls: [
        required(text("title", "Menu")),
        text("description"),
        choice("side", ["left", "right"], "right"),
      ],
      description:
        "A panel that slides in from the edge, for the mobile menu or a detail view that keeps the page behind it.",
      models: { open: false },
      render: (bindings) =>
        h(
          Slideover,
          { title: "", ...bindings },
          {
            body: () => h("p", { style: "margin:0" }, "Navigation"),
            default: OVERLAY_TRIGGER,
          },
        ),
    },
  ],
  [
    "Spinner",
    {
      category: "Feedback",
      controls: [demo(number("size", 20, { min: 8 }))],
      description:
        "An indeterminate loading indicator. It takes the current text color; the caller sizes it.",
      render: (_bindings, sample) => {
        const size = `${String(sample.size ?? 20)}px`;

        return h(Spinner, { style: { height: size, width: size } });
      },
    },
  ],
  [
    "Switch",
    {
      category: "Form",
      controls: [text("label", "Spoilers"), text("description"), flag("disabled")],
      description: "A setting that applies as soon as it is flipped, unlike a checkbox in a form.",
      models: { modelValue: false },
      render: (bindings) => h(Switch, bindings),
      variants: {
        rows: [
          state("default"),
          state("description", { description: "Show scores before the replay." }),
          state("disabled", { disabled: true }),
        ],
      },
    },
  ],
  [
    "Table",
    {
      category: "Data",
      controls: [
        text("caption", "Teams by titles"),
        flag("loading"),
        flag("sticky"),
        demo(flag("sortable", true)),
        demo(flag("selectable")),
        demo(flag("checkable")),
        demo(number("rows", 3, { max: TEAM_ROWS.length, min: 0 })),
      ],
      description:
        "Rows of data in columns. Setting `sorting` makes headers sortable, with the parent sorting the data; `@select` makes rows clickable; `v-model:selection` adds checkboxes to check one row or all of them. An empty `data` shows the empty slot.",
      events: ["select"],
      models: { selection: [], sorting: { desc: true, id: "titles" } },
      render: (
        {
          onSelect,
          selection,
          sorting,
          "onUpdate:selection": onCheck,
          "onUpdate:sorting": onSort,
          ...bindings
        },
        sample,
      ) => {
        const checkable = sample.checkable === true;
        const sortable = sample.sortable === true;
        const sort = sortable ? tableSort.parse(sorting) : undefined;
        const rows = TEAM_ROWS.slice(0, z.number().catch(3).parse(sample.rows));

        return h(
          /* SAFETY: vue-tsc types a generic SFC as a function the h() overloads reject; the props below match Table. */
          Table as Component,
          {
            ...bindings,
            columns: TEAM_COLUMNS,
            data: sortRows(rows, sort),
            onSelect: sample.selectable === true ? onSelect : undefined,
            "onUpdate:selection": checkable ? onCheck : undefined,
            "onUpdate:sorting": sortable ? onSort : undefined,
            rowId: (team: TeamRow) => team.name,
            selection: checkable ? z.array(z.string()).parse(selection) : undefined,
            sorting: sort,
            style: "width:28rem",
          },
          { empty: () => h("p", { style: "margin:0" }, "No team yet") },
        );
      },
    },
  ],
  [
    "Tabs",
    {
      category: "Navigation",
      controls: [required(text("ariaLabel", "Team")), demo(number("tabs", 3, { max: 5, min: 2 }))],
      description:
        "Switches between views of the same page, such as a team's info, matches and earnings. The panels below are the page's own content.",
      models: { modelValue: "info" },
      render: (bindings, sample) =>
        h(Tabs, {
          ariaLabel: "",
          items: [
            { label: "Info", value: "info" },
            { label: "Matches", value: "matches" },
            { label: "Earnings", value: "earnings" },
            { label: "Roster", value: "roster" },
            { label: "Transfers", value: "transfers" },
          ].slice(0, z.number().catch(3).parse(sample.tabs)),
          modelValue: "info",
          ...bindings,
        }),
    },
  ],
  [
    "Textarea",
    {
      category: "Form",
      controls: [
        text("placeholder", "Write a note"),
        number("rows", 3, { min: 1 }),
        flag("autoresize"),
        number("maxrows", null, { min: 1 }),
        flag("disabled"),
      ],
      description:
        "Multi-line text. With `autoresize` it grows with its content, up to `maxrows`, then scrolls.",
      models: { modelValue: "" },
      render: (bindings) => h(Textarea, { ...bindings, style: "width:20rem" }),
    },
  ],
  [
    "Toaster",
    {
      call: (props) =>
        `toast.add({ color: "success", title: "${TOASTS[0].title}"${
          props.description === true ? `, description: "${TOASTS[0].description}"` : ""
        } })`,
      category: "Overlay",
      controls: [demo(flag("description", true))],
      description:
        "Hosts the toasts `useToast().add()` shows: a short confirmation or failure after an action, dismissed on its own. Mount it once at the app root.",
      render: (_bindings, sample) =>
        h(Toaster, null, () =>
          h(
            "div",
            { style: "display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:center" },
            TOASTS.map((toast) =>
              h(ToastTrigger, {
                message: {
                  color: toast.color,
                  description: sample.description === true ? toast.description : undefined,
                  title: toast.title,
                },
              }),
            ),
          ),
        ),
    },
  ],
  [
    "Tooltip",
    {
      category: "Overlay",
      controls: [required(text("text", "Copy the link")), choice("side", OVERLAY_SIDES, "top")],
      description:
        "Names an icon-only control on hover and focus. It repeats what the control does, never information found nowhere else.",
      render: (bindings) =>
        h(Tooltip, { text: "", ...bindings }, () =>
          h(Button, { "aria-label": "Copy", icon: SAMPLE_ICON, variant: "tertiary" }),
        ),
    },
  ],
]);
