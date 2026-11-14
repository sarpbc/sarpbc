import type { Editor } from "@tiptap/core";
import type { EditorToolbarItem } from "@nuxt/ui";

const DEFAULT_TABLE = { cols: 3, rows: 3, withHeaderRow: true } as const;

const shouldShowTableToolbar = ({
  editor,
  view,
}: {
  editor: Editor;
  view: { hasFocus: () => boolean };
}) => editor.isActive("table") && view.hasFocus();

export const useTableEditor = () => {
  const { t } = useI18n();

  const tableHandlers = {
    table: {
      canExecute: (editor: Editor) => editor.can().insertTable(DEFAULT_TABLE),
      execute: (editor: Editor) => editor.chain().focus().insertTable(DEFAULT_TABLE),
      isActive: (editor: Editor) => editor.isActive("table"),
      isDisabled: (editor: Editor) => !editor.can().insertTable(DEFAULT_TABLE),
    },
  };

  const tableToolbarItems = (editor: Editor): EditorToolbarItem[][] => [
    [
      {
        icon: "i-lucide-arrow-up-to-line",
        onClick: () => {
          editor.chain().focus().addRowBefore().run();
        },
        tooltip: { text: t("page.news.editor.tableAddRowBefore") },
      },
      {
        icon: "i-lucide-arrow-down-to-line",
        onClick: () => {
          editor.chain().focus().addRowAfter().run();
        },
        tooltip: { text: t("page.news.editor.tableAddRowAfter") },
      },
      {
        icon: "i-lucide-trash-2",
        onClick: () => {
          editor.chain().focus().deleteRow().run();
        },
        tooltip: { text: t("page.news.editor.tableDeleteRow") },
      },
    ],
    [
      {
        icon: "i-lucide-arrow-left-to-line",
        onClick: () => {
          editor.chain().focus().addColumnBefore().run();
        },
        tooltip: { text: t("page.news.editor.tableAddColumnBefore") },
      },
      {
        icon: "i-lucide-arrow-right-to-line",
        onClick: () => {
          editor.chain().focus().addColumnAfter().run();
        },
        tooltip: { text: t("page.news.editor.tableAddColumnAfter") },
      },
      {
        icon: "i-lucide-trash-2",
        onClick: () => {
          editor.chain().focus().deleteColumn().run();
        },
        tooltip: { text: t("page.news.editor.tableDeleteColumn") },
      },
    ],
    [
      {
        color: "error" as const,
        icon: "i-lucide-table-2",
        onClick: () => {
          editor.chain().focus().deleteTable().run();
        },
        tooltip: { text: t("page.news.editor.tableDeleteTable") },
      },
    ],
  ];

  return {
    shouldShowTableToolbar,
    tableHandlers,
    tableToolbarItems,
  };
};
