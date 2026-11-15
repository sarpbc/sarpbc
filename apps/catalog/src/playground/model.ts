import type { SelectValue, TableSort } from "@sarpbc/design";
import type { VNode } from "vue";

export type ControlValue = string | number | boolean | null;

/*
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

/** A v-model value: a flag, a page, a choice, several choices or a sort. */
export type ModelValue = ControlValue | readonly SelectValue[] | TableSort;

/** What a component emits; the panel only formats it for the log. */
export type Emitted = Event | ModelValue | object | undefined;

export type Listener = (...payload: readonly Emitted[]) => void;

/** Everything the panel binds: tuned props, v-model values and their listeners. */
export type Bindings = Readonly<Record<string, ModelValue | Listener>>;

/** Sidebar groups, in display order, after Nuxt UI's component categories. */
export const CATEGORIES = ["Element", "Form", "Data", "Navigation", "Overlay", "Feedback"] as const;

export type Category = (typeof CATEGORIES)[number];

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

export const icon = (name: string): Control => ({
  initial: false,
  kind: "toggle",
  name,
  value: SAMPLE_ICON,
});

export const flag = (name: string, initial = false): Control => ({
  initial,
  kind: "boolean",
  name,
});

export const text = (name: string, initial = ""): Control => ({ initial, kind: "text", name });

export const choice = (name: string, options: readonly string[], initial: string): Control => ({
  initial,
  kind: "select",
  name,
  options,
});

export const number = (
  name: string,
  initial: number | null,
  bounds: { max?: number; min?: number } = {},
): Control => ({ initial, kind: "number", name, ...bounds });

/** The prop Vue binds a listener to: `select` → `onSelect`, `update:open` → `onUpdate:open`. */
export const listenerOf = (event: string): string =>
  `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;

/** A prop the component cannot do without. */
export const required = (control: Control): Control => ({ ...control, required: true });

/** Shapes the sample instead of setting a prop. */
export const demo = (control: Control): Control => ({ ...control, demo: true });

export const OVERLAY_SIDES = ["top", "right", "bottom", "left"] as const;

export const OVERLAY_ALIGNS = ["start", "center", "end"] as const;

/** The value a control passes to the component, or null when the prop is left out. */
export const propValue = (control: Control, value: ControlValue): ControlValue => {
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

/** The states a control name spreads over in the variants grid. */
export const statesOf = (control: Control): VariantState[] => {
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
