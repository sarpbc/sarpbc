import type { Editor } from "@tiptap/core";
import { parseTweetUrl } from "@sarpbc/utils";

const pickerOpen = ref(false);
let activeEditor: Editor | null = null;

function openTweetPicker(editor: Editor) {
  activeEditor = editor;
  pickerOpen.value = true;
}

function insertTweetTag(url: string) {
  if (!activeEditor) {
    return;
  }

  const parsed = parseTweetUrl(url);
  if (!parsed) {
    return;
  }

  try {
    activeEditor
      .chain()
      .focus()
      .insertContent([{ type: "tweetTag", attrs: { url: parsed.url } }, { type: "paragraph" }])
      .run();
  } finally {
    pickerOpen.value = false;
    activeEditor = null;
  }
}

export function useTweetTagEditor() {
  const tweetTagHandlers = {
    tweetTag: {
      canExecute: () => true,
      execute: (editor: Editor) => {
        openTweetPicker(editor);
        return editor.chain();
      },
      isActive: () => false,
      isDisabled: () => false,
    },
  };

  return {
    tweetPickerOpen: pickerOpen,
    tweetTagHandlers,
    insertTweetTag,
  };
}
