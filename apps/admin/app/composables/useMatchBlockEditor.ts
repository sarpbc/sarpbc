import type { Editor } from "@tiptap/core";
import type { MatchBlockSelector } from "@sarpbc/types";
import { matchBlockNodeAttrs } from "~/utils/editor/matchBlockAttrs";

const pickerOpen = ref(false);
const pickerBlock = ref<MatchBlockSelector | null>(null);
let applyBlock: ((block: MatchBlockSelector) => void) | null = null;

function openMatchBlockPicker(
  block: MatchBlockSelector | null,
  onApply: (block: MatchBlockSelector) => void,
) {
  pickerBlock.value = block;
  applyBlock = onApply;
  pickerOpen.value = true;
}

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

export function useMatchBlockEditor() {
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
    editMatchBlock: openMatchBlockPicker,
  };
}
