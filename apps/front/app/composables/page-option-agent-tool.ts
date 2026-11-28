import type { SelectOption, SelectValue } from "@sarpbc/design";
import type { MaybeRefOrGetter } from "vue";

const pageOptionTool = defineAgentTool({
  annotations: { readOnlyHint: true },
  description:
    "Switch a tab, view, filter or sort order of the current page, such as a player's matches tab, a bracket round or a stats ranking. Use when the user wants this page to show other data than it shows now.",
  name: "choose_page_option",
});

interface PageOptionAgentTool<T extends SelectValue> {
  /** The visible name of the control, which tells its options apart from other controls on the page. */
  control: MaybeRefOrGetter<string>;
  options: MaybeRefOrGetter<readonly SelectOption<T>[]>;
  current: MaybeRefOrGetter<T | null | undefined>;
  choose: (value: T) => void | Promise<void>;
}

export const usePageOptionAgentTool = <T extends SelectValue>({
  control,
  options,
  current,
  choose,
}: PageOptionAgentTool<T>) => {
  useAgentTool(pageOptionTool, {
    execute: async (_input, { target }) => {
      if (!target) {
        throw new Error("Choose an option.");
      }

      await choose(target.item.value);
    },
    key: (option) => `${toValue(control)}: ${option.value}`,
    label: (option) =>
      `${toValue(control)}: ${option.label}${option.value === toValue(current) ? " (current)" : ""}`,
    targets: () => toValue(options).filter((option) => option.disabled !== true),
  });
};
