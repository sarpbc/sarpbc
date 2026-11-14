import type { Editor } from "@tiptap/core";
import { parseTweetUrl } from "@sarpbc/utils";

export const useTweetTagEditor = () => {
  const pickerOpen = ref(false);
  let activeEditor: Editor | null = null;

  const openTweetPicker = (editor: Editor) => {
    activeEditor = editor;
    pickerOpen.value = true;
  };

  const insertTweetTag = (url: string) => {
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
  };

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
};
