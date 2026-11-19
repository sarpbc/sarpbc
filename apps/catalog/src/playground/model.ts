import type { SelectValue, TableSort } from "@sarpbc/design";
import type { VNode } from "vue";

export type ControlValue = string | number | boolean | null;

/**
 * A control's initial value is the component's own default, so a prop is left
 * out of the preview and of the call whenever its control sits at the initial
 * value; a `required` prop is always passed. `toggle` passes `value` while on
 * (an icon name, a sample image). A `demo` control shapes the sample (its
 * data, its wrapper) and is not a prop of the component.
 */
export type Control = (
  | { initial: boolean; kind: "boolean"; name: string }
  | { initial: boolean; kind: "toggle"; name: string; value: string }
  | { initial: number | null; kind: "number"; max?: number; min?: number; name: string }
  | { initial: string; kind: "select"; name: string; options: readonly string[] }
  | { initial: string; kind: "text"; name: string }
) & { demo?: boolean; required?: boolean };

export type ControlValues = Readonly<Record<string, ControlValue>>;

/** One cell coordinate of the variants grid: the control values it overrides. */
export interface VariantState {
  label: string;
  values: ControlValues;
}

/** A control name spreads over that control's values. */
export type VariantAxis = string | readonly VariantState[];

export type ModelValue = ControlValue | readonly SelectValue[] | TableSort;

/** What a component emits; the panel only formats it for the log. */
export type Emitted = Event | ModelValue | object | undefined;

type Listener = (...payload: readonly Emitted[]) => void;

export type Bindings = Readonly<Record<string, ModelValue | Listener>>;

/** Sidebar groups, in display order, after Nuxt UI's component categories. */
export const CATEGORIES = ["Element", "Form", "Data", "Navigation", "Overlay", "Feedback"] as const;

type Category = (typeof CATEGORIES)[number];

export interface Playground {
  category: Category;
  /** Shown instead of the component call, for APIs used through a composable; it gets the demo values too. */
  call?: (props: ControlValues) => string;
  controls: readonly Control[];
  description: string;
  /** Emits the panel logs, besides the v-model updates. */
  events?: readonly string[];
  /** v-model props the panel owns, by name (`modelValue`, `open`, `page`…). */
  models?: Readonly<Record<string, ModelValue>>;
  /** `sample` holds the demo controls that are set. */
  render: (bindings: Bindings, sample: ControlValues) => VNode;
  variants?: { columns?: VariantAxis; rows: VariantAxis };
}

export const SAMPLE_ICON = "i-lucide-circle-dot";

export const SAMPLE_IMAGE = "/sample-avatar.svg";

export const icon = (name: string) =>
  ({
    initial: false,
    kind: "toggle",
    name,
    value: SAMPLE_ICON,
  }) satisfies Control;

export const flag = (name: string, initial = false) =>
  ({
    initial,
    kind: "boolean",
    name,
  }) satisfies Control;

export const text = (name: string, initial = "") =>
  ({ initial, kind: "text", name }) satisfies Control;

export const choice = (name: string, options: readonly string[], initial: string) =>
  ({
    initial,
    kind: "select",
    name,
    options,
  }) satisfies Control;

export const number = (
  name: string,
  initial: number | null,
  bounds: { max?: number; min?: number } = {},
) => ({ initial, kind: "number", name, ...bounds }) satisfies Control;

export const listenerOf = (event: string) => `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;

export const required = (control: Control) => ({ ...control, required: true }) satisfies Control;

export const demo = (control: Control) => ({ ...control, demo: true }) satisfies Control;

export const OVERLAY_SIDES = ["top", "right", "bottom", "left"] as const;

export const OVERLAY_ALIGNS = ["start", "center", "end"] as const;

/** The value a control passes to the component, or null when the prop is left out. */
export const propValue = (control: Control, value: ControlValue) => {
  if (control.required === true || control.demo === true) {
    return value === "" ? null : value;
  }

  switch (control.kind) {
    case "boolean": {
      return value === control.initial ? null : value;
    }

    case "toggle": {
      return value === true ? control.value : null;
    }

    case "number":
    case "select": {
      return value === control.initial ? null : value;
    }

    case "text": {
      return value === "" ? null : value;
    }

    default: {
      return control satisfies never;
    }
  }
};

export const statesOf = (control: Control) => {
  switch (control.kind) {
    case "boolean":
    case "toggle": {
      return [false, true].map((on) => ({
        label: `${control.name}: ${String(on)}`,
        values: { [control.name]: on },
      }));
    }

    case "select": {
      return control.options.map((option) => ({
        label: option,
        values: { [control.name]: option },
      }));
    }

    case "number":
    case "text": {
      return [{ label: control.name, values: {} }];
    }

    default: {
      return control satisfies never;
    }
  }
};
