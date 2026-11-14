import type { InjectionKey } from "vue";
import type { Editor } from "@tiptap/core";
import type { MatchBlockSelector } from "@sarpbc/types";
import { matchBlockNodeAttrs } from "~/utils/editor/matchBlockAttrs";

type EditMatchBlock = (
  block: MatchBlockSelector | null,
  onApply: (block: MatchBlockSelector) => void,
) => void;

const editMatchBlockKey: InjectionKey<EditMatchBlock> = Symbol("editMatchBlock");

export function useEditMatchBlock(): EditMatchBlock {
  const edit = inject(editMatchBlockKey);

  if (!edit) {
    throw new Error("useEditMatchBlock needs an ancestor that calls useMatchBlockEditor");
  }

  return edit;
}

export function useMatchBlockEditor() {
  const pickerOpen = ref(false);
  const pickerBlock = ref<MatchBlockSelector | null>(null);
  let applyBlock: ((block: MatchBlockSelector) => void) | null = null;

  const openMatchBlockPicker: EditMatchBlock = (block, onApply) => {
    pickerBlock.value = block;
    applyBlock = onApply;
    pickerOpen.value = true;
  };

  provide(editMatchBlockKey, openMatchBlockPicker);

  function applyMatchBlock(block: MatchBlockSelector) {
    try {
      applyBlock?.(block);
    } finally {
      pickerOpen.value = false;
      applyBlock = null;
    }
  }

  function insertMatchBlock(editor: Editor) {
    openMatchBlockPicker(null, (block) => {
      editor
        .chain()
        .focus()
        .insertContent([
          { type: "matchBlock", attrs: matchBlockNodeAttrs(block) },
          { type: "paragraph" },
        ])
        .run();
    });
  }

  const matchBlockHandlers = {
    matchBlock: {
      canExecute: () => true,
      execute: (editor: Editor) => {
        insertMatchBlock(editor);

        return editor.chain();
      },
      isActive: () => false,
      isDisabled: () => false,
    },
  };

  return {
    matchPickerOpen: pickerOpen,
    matchPickerBlock: pickerBlock,
    matchBlockHandlers,
    applyMatchBlock,
  };
}
