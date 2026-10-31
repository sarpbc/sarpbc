import type { Editor } from "@tiptap/core";
import type { NewsMatchBlock } from "@sarpbc/utils";
import { matchBlockNodeAttrs } from "~/utils/editor/matchBlockAttrs";

const pickerOpen = ref(false);
const pickerBlock = ref<NewsMatchBlock | null>(null);
let applyBlock: ((block: NewsMatchBlock) => void) | null = null;

function openMatchBlockPicker(
  block: NewsMatchBlock | null,
  onApply: (block: NewsMatchBlock) => void,
) {
  pickerBlock.value = block;
  applyBlock = onApply;
  pickerOpen.value = true;
}

function applyMatchBlock(block: NewsMatchBlock) {
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
