import type { Editor } from "@tiptap/core";
import type { EditorToolbarItem } from "@nuxt/ui";

const DEFAULT_TABLE = { rows: 3, cols: 3, withHeaderRow: true } as const;

export function useTableEditor() {
  const { t } = useI18n();

  const tableHandlers = {
    table: {
      canExecute: (editor: Editor) => editor.can().insertTable(DEFAULT_TABLE),
      execute: (editor: Editor) => editor.chain().focus().insertTable(DEFAULT_TABLE),
      isActive: (editor: Editor) => editor.isActive("table"),
      isDisabled: (editor: Editor) => !editor.can().insertTable(DEFAULT_TABLE),
    },
  };

  function tableToolbarItems(editor: Editor): EditorToolbarItem[][] {
    return [
      [
        {
          icon: "i-lucide-arrow-up-to-line",
          tooltip: { text: t("page.news.editor.tableAddRowBefore") },
          onClick: () => editor.chain().focus().addRowBefore().run(),
        },
        {
          icon: "i-lucide-arrow-down-to-line",
          tooltip: { text: t("page.news.editor.tableAddRowAfter") },
          onClick: () => editor.chain().focus().addRowAfter().run(),
        },
        {
          icon: "i-lucide-trash-2",
          tooltip: { text: t("page.news.editor.tableDeleteRow") },
          onClick: () => editor.chain().focus().deleteRow().run(),
        },
      ],
      [
        {
          icon: "i-lucide-arrow-left-to-line",
          tooltip: { text: t("page.news.editor.tableAddColumnBefore") },
          onClick: () => editor.chain().focus().addColumnBefore().run(),
        },
        {
          icon: "i-lucide-arrow-right-to-line",
          tooltip: { text: t("page.news.editor.tableAddColumnAfter") },
          onClick: () => editor.chain().focus().addColumnAfter().run(),
        },
        {
          icon: "i-lucide-trash-2",
          tooltip: { text: t("page.news.editor.tableDeleteColumn") },
          onClick: () => editor.chain().focus().deleteColumn().run(),
        },
      ],
      [
        {
          icon: "i-lucide-table-2",
          color: "error" as const,
          tooltip: { text: t("page.news.editor.tableDeleteTable") },
          onClick: () => editor.chain().focus().deleteTable().run(),
        },
      ],
    ];
  }

  function shouldShowTableToolbar({
    editor,
    view,
  }: {
    editor: Editor;
    view: { hasFocus: () => boolean };
  }) {
    return editor.isActive("table") && view.hasFocus();
  }

  return {
    tableHandlers,
    tableToolbarItems,
    shouldShowTableToolbar,
  };
}
