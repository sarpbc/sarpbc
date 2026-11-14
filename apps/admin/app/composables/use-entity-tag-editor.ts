import type { Editor } from "@tiptap/core";
import type { NewsEntityTagKind } from "@sarpbc/utils";

export const useEntityTagEditor = () => {
  const pickerOpen = ref(false);
  const pickerKind = ref<NewsEntityTagKind>("player");
  let activeEditor: Editor | null = null;

  const openEntityTagPicker = (kind: NewsEntityTagKind, editor: Editor) => {
    pickerKind.value = kind;
    activeEditor = editor;
    pickerOpen.value = true;
  };

  const insertEntityTag = (payload: { slug: string; label: string }) => {
    if (!activeEditor) {
      return;
    }

    const nodeType = pickerKind.value === "player" ? "playerTag" : "teamTag";

    try {
      activeEditor
        .chain()
        .focus()
        .insertContent([
          { type: nodeType, attrs: { slug: payload.slug, label: payload.label } },
          { type: "text", text: " " },
        ])
        .run();
    } finally {
      pickerOpen.value = false;
      activeEditor = null;
    }
  };

  const createEntityTagHandler = (kind: NewsEntityTagKind) => ({
    canExecute: () => true,
    execute: (editor: Editor) => {
      openEntityTagPicker(kind, editor);

      return editor.chain();
    },
    isActive: () => false,
    isDisabled: () => false,
  });

  const entityTagHandlers = {
    playerTag: createEntityTagHandler("player"),
    teamTag: createEntityTagHandler("team"),
  };

  return {
    pickerOpen,
    pickerKind,
    entityTagHandlers,
    insertEntityTag,
  };
};
