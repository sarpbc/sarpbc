import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";
import { VueRenderer } from "@tiptap/vue-3";

import type { EditorCommand } from "./handlers";
import type { Editor, Range } from "@tiptap/core";
import type { Component } from "vue";

export interface SlashItem extends EditorCommand {
  icon: string;
  label: string;
}

export interface SlashGroup {
  items: readonly SlashItem[];
  label: string;
}

interface SlashCommandsOptions {
  groups: () => readonly SlashGroup[];
  menu: Component;
  run: (editor: Editor, item: SlashItem) => void;
}

const matching = (groups: readonly SlashGroup[], query: string) => {
  const needle = query.trim().toLowerCase();

  return groups.flatMap((group) => {
    const items = group.items.filter((item) => item.label.toLowerCase().includes(needle));

    return items.length > 0 ? [{ ...group, items }] : [];
  });
};

const place = async (menu: HTMLElement, rect: (() => DOMRect | null) | null | undefined) => {
  const box = rect?.();

  if (!box) {
    return;
  }

  const anchor = { getBoundingClientRect: () => box };

  const { x, y } = await computePosition(anchor, menu, {
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    placement: "bottom-start",
    strategy: "fixed",
  });

  Object.assign(menu.style, { left: `${x}px`, top: `${y}px` });
};

const STEPS: ReadonlyMap<string, number> = new Map([
  ["ArrowDown", 1],
  ["ArrowUp", -1],
]);

export const createSlashCommands = ({ groups, menu, run }: SlashCommandsOptions) =>
  Extension.create({
    addProseMirrorPlugins() {
      return [
        Suggestion<SlashItem, SlashItem>({
          char: "/",
          command: ({
            editor,
            props: item,
            range,
          }: {
            editor: Editor;
            props: SlashItem;
            range: Range;
          }) => {
            editor.chain().focus().deleteRange(range).run();
            run(editor, item);
          },
          editor: this.editor,
          items: ({ query }) => matching(groups(), query).flatMap((group) => group.items),
          pluginKey: new PluginKey("slashCommands"),
          render: () => {
            let renderer: VueRenderer | null = null;
            let shown: SlashGroup[] = [];
            let highlighted = 0;
            let choose: ((item: SlashItem) => void) | null = null;

            const close = () => {
              renderer?.destroy();
              renderer?.element?.remove();
              renderer = null;
            };

            const refresh = () => {
              renderer?.updateProps({ command: choose, groups: shown, highlighted });
            };

            return {
              onExit: close,
              onKeyDown: ({ event }) => {
                const items = shown.flatMap((group) => group.items);
                const step = STEPS.get(event.key);

                if (event.key === "Escape") {
                  close();

                  return true;
                }

                if (items.length === 0) {
                  return false;
                }

                if (step !== undefined) {
                  highlighted = (highlighted + step + items.length) % items.length;
                  refresh();

                  return true;
                }

                if (event.key === "Enter") {
                  const item = items[highlighted];

                  if (item) {
                    choose?.(item);
                  }

                  return true;
                }

                return false;
              },
              onStart: (props) => {
                shown = matching(groups(), props.query);
                highlighted = 0;
                choose = props.command;
                renderer = new VueRenderer(menu, {
                  editor: props.editor,
                  props: { command: choose, groups: shown, highlighted },
                });

                if (renderer.element instanceof HTMLElement) {
                  document.body.append(renderer.element);
                  void place(renderer.element, props.clientRect);
                }
              },
              onUpdate: (props) => {
                shown = matching(groups(), props.query);
                highlighted = 0;
                choose = props.command;
                refresh();

                if (renderer?.element instanceof HTMLElement) {
                  void place(renderer.element, props.clientRect);
                }
              },
            };
          },
        }),
      ];
    },

    name: "slashCommands",
  });
