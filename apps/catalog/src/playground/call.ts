import { listenerOf } from "./model.ts";

import type { Control, ControlValue } from "./model.ts";

export type TunedProp = readonly [control: Control, value: ControlValue];

const attribute = ([control, value]: TunedProp): string => {
  switch (control.kind) {
    case "boolean": {
      return value === true ? control.name : `:${control.name}="${String(value)}"`;
    }

    case "number": {
      return `:${control.name}="${String(value)}"`;
    }

    case "select":
    case "text":
    case "toggle": {
      return `${control.name}="${String(value)}"`;
    }

    default: {
      return control satisfies never;
    }
  }
};

export const callOf = (
  component: string,
  props: readonly TunedProp[],
  models: readonly string[],
  events: readonly string[],
): string => {
  const parts = [
    ...models.map((name) =>
      name === "modelValue" ? `v-model="value"` : `v-model:${name}="${name}"`,
    ),
    ...props.map(attribute),
    ...events.map((name) => `@${name}="${listenerOf(name)}"`),
  ];

  return `<${component}${parts.length === 0 ? "" : ` ${parts.join(" ")}`} />`;
};
