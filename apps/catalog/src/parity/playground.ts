import {
  BADGE_COLORS,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  FormField,
  Input,
  Kbd,
  Separator,
} from "@sarpbc/design";
import { h } from "vue";

import type { MigratedProps } from "./cases.ts";
import type { VNode } from "vue";

/*
 * Controls for each component's playground. Select options come from the
 * library's closed unions, so the playground can only express what the API
 * allows. `icon` controls toggle the catalog's sample icon.
 */
export type Control =
  | { initial: boolean; kind: "boolean"; name: string }
  | { initial: boolean; kind: "icon"; name: string }
  | { initial: string; kind: "select"; name: string; options: readonly string[] }
  | { initial: string; kind: "text"; name: string };

export interface Playground {
  controls: readonly Control[];
  /** Overrides the parity render when the playground needs real content. */
  render?: (props: MigratedProps) => VNode;
}

export const SAMPLE_ICON = "sample";

export const PLAYGROUNDS: ReadonlyMap<string, Playground> = new Map<string, Playground>([
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
    },
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
          options: ["text", "email", "password", "search", "url", "tel", "number"],
        },
        { initial: false, kind: "icon", name: "icon" },
        { initial: false, kind: "icon", name: "trailingIcon" },
        { initial: false, kind: "boolean", name: "loading" },
        { initial: false, kind: "boolean", name: "disabled" },
      ],
    },
  ],
  [
    "Textarea",
    {
      controls: [
        { initial: "Write a note", kind: "text", name: "placeholder" },
        { initial: false, kind: "boolean", name: "autoresize" },
        { initial: false, kind: "boolean", name: "disabled" },
      ],
    },
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
      render: (props) =>
        h(FormField, Object.fromEntries(props), () => h(Input, { placeholder: "Search players" })),
    },
  ],
  ["Skeleton", { controls: [] }],
  [
    "Kbd",
    {
      controls: [
        { initial: "md", kind: "select", name: "size", options: ["sm", "md"] },
        { initial: "K", kind: "text", name: "value" },
      ],
      render: (props) => h(Kbd, Object.fromEntries(props)),
    },
  ],
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
      ],
      render: (props) =>
        h("div", { style: "display:flex;align-items:center;width:12rem;height:2rem" }, [
          h(Separator, Object.fromEntries(props)),
        ]),
    },
  ],
]);
