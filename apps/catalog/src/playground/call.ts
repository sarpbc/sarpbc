import type { PlaygroundProps } from "./playgrounds.ts";

/** Formats props as the Vue call a developer would write. */
export const callOf = (component: string, props: PlaygroundProps): string => {
  const attributes = props.map(([name, value]) =>
    value === true ? name : `${name}="${String(value)}"`,
  );

  return `<${component}${attributes.length === 0 ? "" : ` ${attributes.join(" ")}`} />`;
};
