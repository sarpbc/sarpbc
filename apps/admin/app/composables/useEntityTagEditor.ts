import type { Editor } from "@tiptap/core";
import type { NewsEntityTagKind } from "@sarpbc/utils";

const pickerOpen = ref(false);
const pickerKind = ref<NewsEntityTagKind>("player");
let activeEditor: Editor | null = null;

function openEntityTagPicker(kind: NewsEntityTagKind, editor: Editor) {
  pickerKind.value = kind;
  activeEditor = editor;
  pickerOpen.value = true;
}

function insertEntityTag(payload: { slug: string; label: string }) {
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
}

function createEntityTagHandler(kind: NewsEntityTagKind) {
  return {
    canExecute: () => true,
    execute: (editor: Editor) => {
      openEntityTagPicker(kind, editor);
      return editor.chain();
    },
    isActive: () => false,
    isDisabled: () => false,
  };
}

export function useEntityTagEditor() {
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
}
